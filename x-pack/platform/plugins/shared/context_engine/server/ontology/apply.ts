/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import pRetry from 'p-retry';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  RELATIONSHIP_KEY_ATTRIBUTE,
  RELATIONSHIP_KI_TYPE,
  RELATIONSHIP_RELATION_ATTRIBUTE,
} from '../../common/dreaming';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import {
  JOINS_WITH_RELATIONSHIP_TYPE,
  ONTOLOGY_DATASET_KI_TYPE,
  ONTOLOGY_FIELDS_ATTRIBUTE,
  ONTOLOGY_FINGERPRINT_ATTRIBUTE,
  ONTOLOGY_FROM_FIELD_ATTRIBUTE,
  ONTOLOGY_INDEX_ATTRIBUTE,
  ONTOLOGY_OVERLAP_ATTRIBUTE,
  ONTOLOGY_PROFILED_AT_ATTRIBUTE,
  ONTOLOGY_ROW_COUNT_ATTRIBUTE,
  ONTOLOGY_STATUS_ATTRIBUTE,
  ONTOLOGY_SYNONYMS_ATTRIBUTE,
  ONTOLOGY_TERM_KI_TYPE,
  ONTOLOGY_TIME_FIELD_ATTRIBUTE,
  ONTOLOGY_TO_FIELD_ATTRIBUTE,
  STORED_IN_RELATIONSHIP_TYPE,
  isOntologyKiType,
} from '../../common/ontology';
import type { AccessPattern } from '../../common/step_types/apply_dream_changes';
import type {
  ApplyOntologyChangesOutput,
  OntologyChangeSet,
} from '../../common/step_types/apply_ontology_changes';
import type {
  OntologyCatalogEntry,
  OntologyDatasetProfile,
} from '../../common/step_types/catalog_ontology_sources';
import type { VerifiedOntologyJoin } from '../../common/step_types/verify_ontology_joins';
import { KiConflictError, KiNotFoundError } from '../ai_indices/errors';
import {
  findKiRevision,
  isKiDeleted,
  putKiRevision,
  type KiRevision,
  type KiWriter,
  type StoredKi,
} from '../ai_indices/ki_revision';
import { softDeleteKi } from '../ai_indices/ki_write';
import {
  accessPatternAttributes,
  accessPatternsOf,
  renderContent,
  withoutAccessPatternAttributes,
  type VerifyEsql,
} from '../dreaming/access_patterns';
import { addReferences, type PlannedWrite } from '../dreaming/apply';
import type { DreamedKi, DreamedKiAttributes, DreamedKiReference } from '../dreaming/dreamed_ki';
import {
  TRACE_ROUND_ID_PREFIX,
  kiUri,
  memoryUri,
  relationshipId,
  relationshipKey,
} from '../dreaming/ids';
import { isVisibleInSpace, type KiPermissions } from '../dreaming/permissions';
import { ontologyStatusOf } from './existing';
import { datasetKiId, esqlSourceUri, termKiId } from './ids';

const WRITE_CONFLICT_RETRIES = 3;

export interface OntologyApplyContext {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  writer: KiWriter;
  /** The space the run is in: its KIs are visible there, and KIs hidden from it are left alone. */
  spaceId: string;
  verifyEsql: VerifyEsql;
  abortSignal?: AbortSignal;
  /** Collects the writes by KI id instead of storing them. */
  dryRun?: Map<string, PlannedWrite>;
  now?: Date;
}

export interface OntologyApplyInput {
  catalog: readonly OntologyCatalogEntry[];
  profiles: readonly OntologyDatasetProfile[];
  changes: OntologyChangeSet;
  joins: readonly VerifiedOntologyJoin[];
  stale: readonly string[];
}

type ApplyResult = Omit<ApplyOntologyChangesOutput, 'would_write'>;

type Build = (current: DreamedKi | undefined) => Omit<DreamedKi, 'governance'> | 'certified';

type WriteResult = 'created' | 'updated' | 'unchanged' | 'skipped' | 'certified' | 'foreign';

const spacePermissions = (spaceId: string): KiPermissions => ({
  kibana: { privileges: [{ space: spaceId }] },
});

const COMPARED_FIELDS = ['type', 'title', 'description', 'content', 'attributes', 'references'];

const isUnchanged = (current: DreamedKi | undefined, next: Omit<DreamedKi, 'governance'>) =>
  current !== undefined &&
  COMPARED_FIELDS.every((field) =>
    isEqual((current as Record<string, unknown>)[field], (next as Record<string, unknown>)[field])
  );

const isOwnType = (type: string): boolean =>
  isOntologyKiType(type) || type === RELATIONSHIP_KI_TYPE;

const activeSource = (revision: KiRevision | undefined): DreamedKi | undefined => {
  const source = revision?.source as DreamedKi | undefined;
  return source && !isKiDeleted(source) ? source : undefined;
};

const storedDocument = (
  document: Omit<DreamedKi, 'governance'>,
  kiId: string,
  current: DreamedKi | undefined,
  { writer, spaceId, now }: OntologyApplyContext
): StoredKi => {
  const timestamp = (now ?? new Date()).toISOString();
  return {
    ...document,
    '@timestamp': timestamp,
    id: kiId,
    updated_at: timestamp,
    permissions: spacePermissions(spaceId),
    governance: {
      provenance: {
        created_by: current?.governance?.provenance?.created_by ?? writer,
        updated_by: writer,
      },
      lifecycle: { status: 'active' },
    },
  };
};

const readCurrent = async (
  context: OntologyApplyContext,
  kiId: string
): Promise<{ revision?: KiRevision; current?: DreamedKi; hidden: boolean; planned: boolean }> => {
  const planned = context.dryRun?.get(kiId);
  if (planned) {
    return { current: planned.ki as DreamedKi | undefined, hidden: false, planned: true };
  }
  const { esClient, aiIndexId, dest, abortSignal, spaceId } = context;
  const revision = await findKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    includeSource: true,
    abortSignal,
  });
  const source = revision?.source as DreamedKi | undefined;
  return {
    revision,
    current: activeSource(revision),
    hidden: source !== undefined && !isVisibleInSpace(source.permissions, spaceId),
    planned: false,
  };
};

/** Writes one ontology KI or relationship, leaving KIs of other kinds and certified ones alone. */
const writeOntologyKi = async (
  context: OntologyApplyContext,
  kiId: string,
  build: Build
): Promise<WriteResult> => {
  const { esClient, aiIndexId, dest, abortSignal, dryRun } = context;
  return pRetry(
    async () => {
      const { revision, current, hidden, planned } = await readCurrent(context, kiId);
      if (hidden) {
        return 'skipped' as const;
      }
      if (current && !isOwnType(current.type)) {
        return 'foreign' as const;
      }
      const document = build(current);
      if (document === 'certified') {
        return document;
      }
      if (isUnchanged(current, document)) {
        return 'unchanged' as const;
      }
      const stored = storedDocument(document, kiId, current, context);
      if (dryRun) {
        const previous = dryRun.get(kiId);
        dryRun.set(kiId, {
          change: previous?.change === 'created' || !current ? 'created' : 'updated',
          ki: stored,
        });
        return planned || current ? ('updated' as const) : ('created' as const);
      }
      await putKiRevision({
        esClient,
        aiIndexId,
        dest,
        kiId,
        document: stored,
        existing: dest.type === 'data_stream' ? undefined : revision,
        failIfExists: revision === undefined,
        refresh: true,
        abortSignal,
      });
      return current ? ('updated' as const) : ('created' as const);
    },
    {
      retries: WRITE_CONFLICT_RETRIES,
      onFailedAttempt: (error) => {
        if (!(error instanceof KiConflictError)) {
          throw error;
        }
      },
    }
  );
};

/** Whether an ontology KI exists, or a dry run of this step would create it. */
const ontologyKiExists = async (context: OntologyApplyContext, kiId: string): Promise<boolean> => {
  const { current, hidden } = await readCurrent(context, kiId);
  return !hidden && current !== undefined && isOntologyKiType(current.type);
};

const deleteOntologyKi = async (
  context: OntologyApplyContext,
  kiId: string
): Promise<'deleted' | 'skipped' | 'certified'> => {
  const { current, hidden } = await readCurrent(context, kiId);
  if (hidden || !current || !isOntologyKiType(current.type)) {
    return 'skipped';
  }
  if (ontologyStatusOf(current) === 'certified') {
    return 'certified';
  }
  const { esClient, aiIndexId, dest, writer, abortSignal, dryRun } = context;
  if (dryRun) {
    dryRun.set(kiId, { change: 'deleted' });
    return 'deleted';
  }
  try {
    await softDeleteKi(esClient, {
      aiIndexId,
      dest,
      kiId,
      writer,
      deleteLinkedRelationships: true,
      refresh: true,
      abortSignal,
    });
    return 'deleted';
  } catch (error) {
    if (error instanceof KiNotFoundError) {
      return 'skipped';
    }
    throw error;
  }
};

/** The access patterns to store: the verified ones, or the current ones when none of the new ones run. */
const verifiedPatterns = async (
  { verifyEsql }: OntologyApplyContext,
  proposed: readonly AccessPattern[] | undefined,
  current: DreamedKi | undefined
): Promise<{ patterns: AccessPattern[]; dropped: number }> => {
  if (!proposed) {
    return { patterns: accessPatternsOf(current), dropped: 0 };
  }
  const passed = await Promise.all(
    proposed.map(({ esql_example: example }) => verifyEsql(example))
  );
  const kept = proposed.filter((_, index) => passed[index]);
  const dropped = proposed.length - kept.length;
  if (kept.length === 0 && proposed.length > 0) {
    return { patterns: accessPatternsOf(current), dropped };
  }
  return { patterns: kept, dropped };
};

const withPatterns = (
  content: string,
  attributes: DreamedKiAttributes,
  patterns: readonly AccessPattern[]
): Pick<DreamedKi, 'content' | 'attributes'> => ({
  ...(renderContent(content, patterns) !== undefined && {
    content: renderContent(content, patterns),
  }),
  attributes: {
    ...withoutAccessPatternAttributes(attributes),
    ...accessPatternAttributes(patterns),
  },
});

const relationshipDocument =
  ({
    fromId,
    fromTitle,
    relation,
    toId,
    toTitle,
    description,
    attributes = {},
  }: {
    fromId: string;
    fromTitle: string;
    relation: string;
    toId: string;
    toTitle: string;
    description: string;
    attributes?: DreamedKiAttributes;
  }): Build =>
  (current) => {
    const key = relationshipKey(fromId, relation, toId);
    const title = `${fromTitle} ${relation.replace(/_/g, ' ')} ${toTitle}`;
    return {
      id: relationshipId(key),
      type: RELATIONSHIP_KI_TYPE,
      title,
      description,
      content: `${title}.\n${description}`,
      attributes: {
        ...current?.attributes,
        ...attributes,
        [RELATIONSHIP_RELATION_ATTRIBUTE]: relation,
        [RELATIONSHIP_KEY_ATTRIBUTE]: key,
      },
      references: addReferences(current?.references, [
        { uri: kiUri(fromId), relation: 'relates_to', description: 'from' },
        { uri: kiUri(toId), relation: 'relates_to', description: 'to' },
      ]),
    };
  };

/** `<dataset>:<field>` split at the last colon: dataset names of remote clusters hold one too. */
export const parseTermField = (value: string): { dataset: string; field: string } | undefined => {
  const separator = value.lastIndexOf(':');
  if (separator <= 0 || separator === value.length - 1) {
    return undefined;
  }
  return { dataset: value.slice(0, separator).trim(), field: value.slice(separator + 1).trim() };
};

const termContent = (
  description: string | undefined,
  synonyms: readonly string[],
  fields: ReadonlyArray<{ dataset: string; field: string }>
): string => {
  const byDataset = new Map<string, string[]>();
  for (const { dataset, field } of fields) {
    byDataset.set(dataset, [...(byDataset.get(dataset) ?? []), field]);
  }
  return [
    ...(description ? [description] : []),
    ...(synonyms.length > 0 ? [`Also called: ${synonyms.join(', ')}.`] : []),
    [
      'Stored in:',
      ...[...byDataset].map(([dataset, names]) => `- ${dataset}: ${names.join(', ')}`),
    ].join('\n'),
  ].join('\n\n');
};

const uniqueSynonyms = (name: string, synonyms: readonly string[] | undefined): string[] => {
  const seen = new Set([name.trim().toLowerCase()]);
  return (synonyms ?? [])
    .map((synonym) => synonym.trim())
    .filter((synonym) => {
      const key = synonym.toLowerCase();
      if (!synonym || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const roundReferences = (roundIds: readonly string[] | undefined): DreamedKiReference[] =>
  (roundIds ?? [])
    .filter((id) => id.startsWith(TRACE_ROUND_ID_PREFIX))
    .map((id) => ({ uri: memoryUri(id), relation: 'derived_from' }));

const count = (result: ApplyResult, written: WriteResult): void => {
  if (written === 'created' || written === 'updated') {
    result[written] += 1;
  }
};

/**
 * Applies what ontology discovery found, in order: datasets, then terms and the datasets that store
 * them, then verified joins, then stale datasets.
 */
export const applyOntologyChanges = async (
  context: OntologyApplyContext,
  { catalog, profiles, changes, joins, stale }: OntologyApplyInput
): Promise<ApplyResult> => {
  const result: ApplyResult = {
    created: 0,
    updated: 0,
    deleted: 0,
    rejected: [],
    dropped_access_patterns: 0,
  };
  const reject = (item: string, reason: string) => result.rejected.push({ item, reason });
  const datasets = new Map(catalog.map((entry) => [entry.name, entry]));
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  const profiledAt = (context.now ?? new Date()).toISOString();

  const seenDatasets = new Set<string>();
  for (const change of changes.datasets) {
    const item = `dataset ${change.name}`;
    const entry = datasets.get(change.name);
    if (!entry) {
      reject(item, "it is not a dataset of the AI index's ES|QL sources");
      continue;
    }
    if (seenDatasets.has(change.name)) {
      reject(item, 'it is listed twice');
      continue;
    }
    seenDatasets.add(change.name);
    const kiId = datasetKiId(change.name);
    const profile = profilesByName.get(change.name);
    const { current } = await readCurrent(context, kiId);
    const { patterns, dropped } = await verifiedPatterns(context, change.access_patterns, current);
    result.dropped_access_patterns += dropped;
    const written = await writeOntologyKi(context, kiId, (existing) => {
      if (existing && ontologyStatusOf(existing) === 'certified') {
        return 'certified';
      }
      return {
        id: kiId,
        type: ONTOLOGY_DATASET_KI_TYPE,
        title: change.name,
        description: change.description,
        ...withPatterns(
          change.content,
          {
            ...existing?.attributes,
            [ONTOLOGY_STATUS_ATTRIBUTE]: 'draft',
            [ONTOLOGY_INDEX_ATTRIBUTE]: change.name,
            'ontology.kind': entry.kind,
            ...(profile && {
              [ONTOLOGY_FINGERPRINT_ATTRIBUTE]: profile.fingerprint,
              [ONTOLOGY_PROFILED_AT_ATTRIBUTE]: profiledAt,
              ...(profile.time_field !== undefined && {
                [ONTOLOGY_TIME_FIELD_ATTRIBUTE]: profile.time_field,
              }),
              ...(profile.row_count !== undefined && {
                [ONTOLOGY_ROW_COUNT_ATTRIBUTE]: profile.row_count,
              }),
            }),
          },
          patterns
        ),
        references: addReferences(existing?.references, [
          ...entry.source_ids.map((id) => ({
            uri: esqlSourceUri(id),
            relation: 'derived_from' as const,
          })),
          ...roundReferences(change.source_round_ids),
        ]),
      };
    });
    if (written === 'certified') {
      reject(item, 'it is certified');
    } else if (written === 'foreign') {
      reject(item, 'its id belongs to a KI that is not part of the ontology');
    }
    count(result, written);
  }

  const seenTerms = new Set<string>();
  for (const change of changes.terms) {
    const name = change.name.trim();
    const item = `term ${name}`;
    const kiId = termKiId(name);
    if (seenTerms.has(kiId)) {
      reject(item, 'it is listed twice');
      continue;
    }
    seenTerms.add(kiId);

    if (change.delete) {
      const deleted = await deleteOntologyKi(context, kiId);
      if (deleted === 'certified') {
        reject(item, 'it is certified');
      } else if (deleted === 'deleted') {
        result.deleted += 1;
      }
      continue;
    }

    const fields = (change.fields ?? []).flatMap((value) => {
      const parsed = parseTermField(value);
      const entry = parsed && datasets.get(parsed.dataset);
      return parsed && entry?.fields.some(({ name: field }) => field === parsed.field)
        ? [parsed]
        : [];
    });
    if (fields.length === 0) {
      reject(item, 'it names no field of a cataloged dataset as <dataset>:<field>');
      continue;
    }
    const synonyms = uniqueSynonyms(name, change.synonyms);
    const { current } = await readCurrent(context, kiId);
    const { patterns, dropped } = await verifiedPatterns(context, change.access_patterns, current);
    result.dropped_access_patterns += dropped;
    const description = change.description ?? current?.description;
    const written = await writeOntologyKi(context, kiId, (existing) => {
      if (existing && ontologyStatusOf(existing) === 'certified') {
        return 'certified';
      }
      return {
        id: kiId,
        type: ONTOLOGY_TERM_KI_TYPE,
        title: existing?.title ?? name,
        ...(description !== undefined && { description }),
        ...withPatterns(
          termContent(description, synonyms, fields),
          {
            ...existing?.attributes,
            [ONTOLOGY_STATUS_ATTRIBUTE]: 'draft',
            [ONTOLOGY_SYNONYMS_ATTRIBUTE]: synonyms,
            [ONTOLOGY_FIELDS_ATTRIBUTE]: fields.map(({ dataset, field }) => `${dataset}:${field}`),
          },
          patterns
        ),
        references: addReferences(
          existing?.references,
          [...new Set(fields.map(({ dataset }) => dataset))].flatMap(
            (dataset) =>
              datasets.get(dataset)?.source_ids.map((id) => ({
                uri: esqlSourceUri(id),
                relation: 'derived_from' as const,
              })) ?? []
          )
        ),
      };
    });
    if (written === 'certified') {
      reject(item, 'it is certified');
      continue;
    }
    if (written === 'foreign') {
      reject(item, 'its id belongs to a KI that is not part of the ontology');
      continue;
    }
    count(result, written);

    const title = current?.title ?? name;
    for (const dataset of new Set(fields.map((field) => field.dataset))) {
      const datasetId = datasetKiId(dataset);
      const relationshipItem = `relationship ${title} ${STORED_IN_RELATIONSHIP_TYPE} ${dataset}`;
      if (!(await ontologyKiExists(context, datasetId))) {
        reject(relationshipItem, 'the dataset is not described yet');
        continue;
      }
      const stored = fields.filter((field) => field.dataset === dataset).map(({ field }) => field);
      const key = relationshipKey(kiId, STORED_IN_RELATIONSHIP_TYPE, datasetId);
      count(
        result,
        await writeOntologyKi(
          context,
          relationshipId(key),
          relationshipDocument({
            fromId: kiId,
            fromTitle: title,
            relation: STORED_IN_RELATIONSHIP_TYPE,
            toId: datasetId,
            toTitle: dataset,
            description: `${title} is stored in ${dataset} as ${stored.join(', ')}.`,
          })
        )
      );
    }
  }

  for (const join of joins) {
    const fromId = datasetKiId(join.from_dataset);
    const toId = datasetKiId(join.to_dataset);
    const item = `relationship ${join.from_dataset} ${JOINS_WITH_RELATIONSHIP_TYPE} ${join.to_dataset}`;
    if (!datasets.has(join.from_dataset) || !datasets.has(join.to_dataset)) {
      reject(item, 'a dataset is not in the catalog');
      continue;
    }
    if (!(await ontologyKiExists(context, fromId)) || !(await ontologyKiExists(context, toId))) {
      reject(item, 'a dataset is not described yet');
      continue;
    }
    const key = relationshipKey(fromId, JOINS_WITH_RELATIONSHIP_TYPE, toId);
    count(
      result,
      await writeOntologyKi(
        context,
        relationshipId(key),
        relationshipDocument({
          fromId,
          fromTitle: join.from_dataset,
          relation: JOINS_WITH_RELATIONSHIP_TYPE,
          toId,
          toTitle: join.to_dataset,
          description: `${join.from_dataset}.${join.from_field} matches ${join.to_dataset}.${
            join.to_field
          }: ${Math.round(join.overlap * 100)}% of ${
            join.sampled
          } sampled values were found. In ES|QL, join them with LOOKUP JOIN when ${
            join.to_dataset
          } is a lookup index, otherwise with ENRICH or two queries.`,
          attributes: {
            [ONTOLOGY_FROM_FIELD_ATTRIBUTE]: join.from_field,
            [ONTOLOGY_TO_FIELD_ATTRIBUTE]: join.to_field,
            [ONTOLOGY_OVERLAP_ATTRIBUTE]: join.overlap,
          },
        })
      )
    );
  }

  for (const kiId of stale) {
    const deleted = await deleteOntologyKi(context, kiId);
    if (deleted === 'certified') {
      reject(`dataset ${kiId}`, 'it is certified; delete it by hand if its dataset is gone');
    } else if (deleted === 'deleted') {
      result.deleted += 1;
    }
  }

  return result;
};

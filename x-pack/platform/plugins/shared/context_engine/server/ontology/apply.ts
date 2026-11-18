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
  MAX_DREAMING_ACCESS_PATTERNS,
  RELATIONSHIP_KEY_ATTRIBUTE,
  RELATIONSHIP_KI_TYPE,
  RELATIONSHIP_RELATION_ATTRIBUTE,
  type DreamingEntityType,
} from '../../common/dreaming';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import {
  JOINS_WITH_RELATIONSHIP_TYPE,
  MAX_ONTOLOGY_JOIN_FIELDS,
  ONTOLOGY_ATTRIBUTE_FIELDS_ATTRIBUTE,
  ONTOLOGY_CONNECTOR_ACCESS_PATTERNS_ATTRIBUTE,
  ONTOLOGY_CONNECTOR_ID_ATTRIBUTE,
  ONTOLOGY_DATASET_KI_TYPE,
  ONTOLOGY_ENTITY_TYPE_ATTRIBUTE,
  ONTOLOGY_FIELDS_ATTRIBUTE,
  ONTOLOGY_FINGERPRINT_ATTRIBUTE,
  ONTOLOGY_FROM_FIELD_ATTRIBUTE,
  ONTOLOGY_INDEX_ATTRIBUTE,
  ONTOLOGY_JOIN_FIELDS_ATTRIBUTE,
  ONTOLOGY_KIND_ATTRIBUTE,
  ONTOLOGY_OVERLAP_ATTRIBUTE,
  ONTOLOGY_PROFILED_AT_ATTRIBUTE,
  ONTOLOGY_ROW_COUNT_ATTRIBUTE,
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
  ConnectorAccessPattern,
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
  slugify,
} from '../dreaming/ids';
import { isVisibleInSpace, type KiPermissions } from '../dreaming/permissions';
import { fromSourcesOf, sourceMatchesDataset } from './esql';
import { readOntologyKis, sourceIdsOf, stringsOf } from './existing';
import { datasetKiId, sourceUri, termKiId } from './ids';

const WRITE_CONFLICT_RETRIES = 3;
const ACCESS_PATTERNS_HEADING = '## Access patterns';
const JOIN_FIELD_TYPES: ReadonlySet<string> = new Set([
  'keyword',
  'constant_keyword',
  'wildcard',
  'long',
  'integer',
  'short',
  'byte',
  'unsigned_long',
  'ip',
]);

/** Whether a connector access pattern's example call runs. */
export type VerifyConnectorCall = (subAction: string, params: unknown) => Promise<boolean>;

export interface OntologyApplyContext {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  writer: KiWriter;
  /** The space the run is in: its KIs are visible there, and KIs hidden from it are left alone. */
  spaceId: string;
  /** The source of the AI index this run describes: it owns its parts of shared KIs. */
  sourceId: string;
  /** The configured entity types. When there are any, terms are only written for them. */
  entityTypes: readonly DreamingEntityType[];
  verifyEsql: VerifyEsql;
  /** Set for a connector source: runs a connector access pattern's example. */
  verifyConnectorCall?: VerifyConnectorCall;
  /** Set for a connector source: the connector its access patterns call. */
  connectorId?: string;
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

type Build = (current: DreamedKi | undefined) => Omit<DreamedKi, 'governance'>;

type WriteResult = 'created' | 'updated' | 'unchanged' | 'skipped' | 'foreign';

interface StoredConnectorPattern extends ConnectorAccessPattern {
  connector_id: string;
}

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

/** Writes one ontology KI or relationship, leaving KIs of other kinds alone. */
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

/** Soft-deletes an ontology KI or relationship, and the relationships linking it. */
const deleteOwnKi = async (
  context: OntologyApplyContext,
  kiId: string
): Promise<'deleted' | 'skipped'> => {
  const { current, hidden } = await readCurrent(context, kiId);
  if (hidden || !current || !isOwnType(current.type)) {
    return 'skipped';
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

const count = (result: ApplyResult, written: WriteResult | 'deleted'): void => {
  if (written === 'created' || written === 'updated' || written === 'deleted') {
    result[written] += 1;
  }
};

/** The ES|QL access patterns that run, or `undefined` when there are none to replace. */
const verifiedEsqlPatterns = async (
  { verifyEsql }: OntologyApplyContext,
  proposed: readonly AccessPattern[] | undefined
): Promise<{ patterns?: AccessPattern[]; dropped: number }> => {
  if (!proposed) {
    return { dropped: 0 };
  }
  const passed = await Promise.all(
    proposed.map(({ esql_example: example }) => verifyEsql(example))
  );
  const kept = proposed.filter((_, index) => passed[index]);
  return {
    ...((kept.length > 0 || proposed.length === 0) && { patterns: kept }),
    dropped: proposed.length - kept.length,
  };
};

const parseParams = (text: string): unknown => {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
};

/** The connector access patterns whose example call runs, or `undefined` when none to replace. */
const verifiedConnectorPatterns = async (
  { verifyConnectorCall }: OntologyApplyContext,
  proposed: readonly ConnectorAccessPattern[] | undefined
): Promise<{ patterns?: ConnectorAccessPattern[]; dropped: number }> => {
  if (!proposed) {
    return { dropped: 0 };
  }
  const passed = await Promise.all(
    proposed.map(async ({ sub_action: subAction, params_example: example }) => {
      const params = parseParams(example);
      return verifyConnectorCall !== undefined && params !== undefined
        ? verifyConnectorCall(subAction, params)
        : false;
    })
  );
  const kept = proposed.filter((_, index) => passed[index]);
  return {
    ...((kept.length > 0 || proposed.length === 0) && { patterns: kept }),
    dropped: proposed.length - kept.length,
  };
};

const connectorPatternsOf = (ki: DreamedKi | undefined): StoredConnectorPattern[] =>
  stringsOf(ki?.attributes?.[ONTOLOGY_CONNECTOR_ACCESS_PATTERNS_ATTRIBUTE]).flatMap((entry) => {
    try {
      const parsed = JSON.parse(entry) as Partial<StoredConnectorPattern>;
      return typeof parsed.sub_action === 'string' && typeof parsed.connector_id === 'string'
        ? [parsed as StoredConnectorPattern]
        : [];
    } catch {
      return [];
    }
  });

/** The ES|QL patterns to keep: other sources' ones, then this source's new ones, up to the cap. */
const mergeEsqlPatterns = (
  current: readonly AccessPattern[],
  proposed: readonly AccessPattern[] | undefined,
  ownDatasets: ReadonlySet<string>
): AccessPattern[] => {
  if (!proposed) {
    return [...current];
  }
  const targetsOwn = ({ esql_example: example }: AccessPattern) =>
    fromSourcesOf(example).some((source) =>
      [...ownDatasets].some((dataset) => sourceMatchesDataset(source, dataset))
    );
  return [...current.filter((pattern) => !targetsOwn(pattern)), ...proposed].slice(
    -MAX_DREAMING_ACCESS_PATTERNS
  );
};

/** The connector patterns to keep: other connectors' ones, then this connector's new ones. */
const mergeConnectorPatterns = (
  current: readonly StoredConnectorPattern[],
  proposed: readonly ConnectorAccessPattern[] | undefined,
  connectorId: string | undefined
): StoredConnectorPattern[] => {
  if (!proposed || connectorId === undefined) {
    return [...current];
  }
  return [
    ...current.filter((pattern) => pattern.connector_id !== connectorId),
    ...proposed.map((pattern) => ({ ...pattern, connector_id: connectorId })),
  ].slice(-MAX_DREAMING_ACCESS_PATTERNS);
};

const renderConnectorPattern = ({
  question_type: label,
  returns,
  connector_id: connectorId,
  sub_action: subAction,
  params_template: template,
  params_example: example,
}: StoredConnectorPattern): string =>
  [
    `- [${label}] ${returns}`,
    `  Call: execute_connector_sub_action {"connectorId":"${connectorId}","subAction":"${subAction}","params":${template}}`,
    `  Example params: ${example}`,
  ].join('\n');

/** Content with both kinds of access patterns in one section, attributes carrying them. */
const withPatterns = (
  content: string | undefined,
  attributes: DreamedKiAttributes,
  esql: readonly AccessPattern[],
  connector: readonly StoredConnectorPattern[]
): Pick<DreamedKi, 'content' | 'attributes'> => {
  const withEsql = renderContent(content, esql);
  const connectorLines = connector.map(renderConnectorPattern);
  const rendered =
    connectorLines.length === 0
      ? withEsql
      : esql.length > 0
      ? `${withEsql}\n${connectorLines.join('\n')}`
      : [content, [ACCESS_PATTERNS_HEADING, ...connectorLines].join('\n')]
          .filter(Boolean)
          .join('\n\n');
  const { [ONTOLOGY_CONNECTOR_ACCESS_PATTERNS_ATTRIBUTE]: _previous, ...rest } =
    withoutAccessPatternAttributes(attributes);
  return {
    ...(rendered !== undefined && { content: rendered }),
    attributes: {
      ...rest,
      ...accessPatternAttributes(esql),
      ...(connector.length > 0 && {
        [ONTOLOGY_CONNECTOR_ACCESS_PATTERNS_ATTRIBUTE]: connector.map((pattern) =>
          JSON.stringify(pattern)
        ),
      }),
    },
  };
};

const withSourceReference = (
  references: readonly DreamedKiReference[] | undefined,
  sourceId: string,
  cited: boolean
): DreamedKiReference[] => {
  const uri = sourceUri(sourceId);
  const others = (references ?? []).filter(
    (reference) => !(reference.uri === uri && reference.relation === 'derived_from')
  );
  return cited ? addReferences(others, [{ uri, relation: 'derived_from' }]) : others;
};

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

const storedInId = (termId: string, datasetName: string): string =>
  relationshipId(relationshipKey(termId, STORED_IN_RELATIONSHIP_TYPE, datasetKiId(datasetName)));

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
  fields: readonly string[]
): string => {
  const byDataset = new Map<string, string[]>();
  for (const value of fields) {
    const parsed = parseTermField(value);
    if (parsed) {
      byDataset.set(parsed.dataset, [...(byDataset.get(parsed.dataset) ?? []), parsed.field]);
    }
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

const uniqueSynonyms = (name: string, synonyms: readonly string[]): string[] => {
  const seen = new Set([name.trim().toLowerCase()]);
  return synonyms
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

const datasetOf = (value: string): string | undefined => parseTermField(value)?.dataset;

const joinFieldsOf = ({ kind, fields }: OntologyCatalogEntry): string[] =>
  kind === 'connector'
    ? []
    : fields
        .filter(({ type, aggregatable }) => aggregatable && JOIN_FIELD_TYPES.has(type))
        .slice(0, MAX_ONTOLOGY_JOIN_FIELDS)
        .map(({ name, type }) => `${name}:${type}`);

/**
 * Rewrites a term without the fields of deleted datasets, deleting it when none is left, and drops
 * the source's reference when `sourceId` is given.
 */
const pruneTerm = async (
  context: OntologyApplyContext,
  term: DreamedKi,
  deletedDatasets: ReadonlySet<string>,
  dropSourceId?: string
): Promise<WriteResult | 'deleted'> => {
  const fields = stringsOf(term.attributes?.[ONTOLOGY_FIELDS_ATTRIBUTE]);
  const kept = fields.filter((value) => !deletedDatasets.has(datasetOf(value) ?? ''));
  if (kept.length === 0) {
    return deleteOwnKi(context, term.id);
  }
  return writeOntologyKi(context, term.id, (current) => {
    const base = current ?? term;
    const synonyms = stringsOf(base.attributes?.[ONTOLOGY_SYNONYMS_ATTRIBUTE]);
    const esql = accessPatternsOf(base).filter(
      ({ esql_example: example }) =>
        !fromSourcesOf(example).some((source) =>
          [...deletedDatasets].some((dataset) => sourceMatchesDataset(source, dataset))
        )
    );
    return {
      ...base,
      id: term.id,
      type: ONTOLOGY_TERM_KI_TYPE,
      title: base.title,
      ...withPatterns(
        termContent(base.description, synonyms, kept),
        {
          ...base.attributes,
          [ONTOLOGY_FIELDS_ATTRIBUTE]: kept,
          ...(base.attributes?.[ONTOLOGY_ATTRIBUTE_FIELDS_ATTRIBUTE] !== undefined && {
            [ONTOLOGY_ATTRIBUTE_FIELDS_ATTRIBUTE]: stringsOf(
              base.attributes[ONTOLOGY_ATTRIBUTE_FIELDS_ATTRIBUTE]
            ).filter((entry) => !deletedDatasets.has(datasetOf(entry.split('=')[1] ?? '') ?? '')),
          }),
        },
        esql,
        connectorPatternsOf(base)
      ),
      references:
        dropSourceId !== undefined
          ? withSourceReference(base.references, dropSourceId, false)
          : base.references ?? [],
    };
  });
};

/**
 * Takes the given datasets off this run's source: a dataset another source still reads keeps its
 * KI without this source's reference; the rest are deleted with their relationships, and their
 * fields are taken off every term, deleting terms left with none.
 */
const dropSourceDatasets = async (
  context: OntologyApplyContext,
  result: ApplyResult,
  datasetIds: readonly string[],
  { dropTermReferences }: { dropTermReferences: boolean }
): Promise<void> => {
  const { sourceId } = context;
  const deleted = new Set<string>();
  for (const kiId of datasetIds) {
    const { current, hidden } = await readCurrent(context, kiId);
    if (hidden || !current || current.type !== ONTOLOGY_DATASET_KI_TYPE) {
      continue;
    }
    const remaining = sourceIdsOf(current).filter((id) => id !== sourceId);
    if (remaining.length > 0) {
      count(
        result,
        await writeOntologyKi(context, kiId, (latest) => ({
          ...(latest ?? current),
          references: withSourceReference((latest ?? current).references, sourceId, false),
        }))
      );
      continue;
    }
    const index = current.attributes?.[ONTOLOGY_INDEX_ATTRIBUTE];
    count(result, await deleteOwnKi(context, kiId));
    if (typeof index === 'string') {
      deleted.add(index);
    }
  }
  if (deleted.size === 0 && !dropTermReferences) {
    return;
  }
  const { esClient, dest, spaceId, abortSignal } = context;
  const terms = (await readOntologyKis({ esClient, dest, spaceId, abortSignal })).filter(
    ({ type }) => type === ONTOLOGY_TERM_KI_TYPE
  );
  for (const term of terms) {
    const fields = stringsOf(term.attributes?.[ONTOLOGY_FIELDS_ATTRIBUTE]);
    const touched = fields.some((value) => deleted.has(datasetOf(value) ?? ''));
    const cites = sourceIdsOf(term).includes(sourceId);
    if (touched || (dropTermReferences && cites)) {
      count(
        result,
        await pruneTerm(context, term, deleted, dropTermReferences ? sourceId : undefined)
      );
    }
  }
};

const emptyResult = (): ApplyResult => ({
  created: 0,
  updated: 0,
  deleted: 0,
  rejected: [],
  dropped_access_patterns: 0,
});

/**
 * Applies what ontology discovery found for one source, in order: datasets, then terms and the
 * datasets that store them, then verified joins, then the source's stale datasets.
 */
export const applyOntologyChanges = async (
  context: OntologyApplyContext,
  { catalog, profiles, changes, joins, stale }: OntologyApplyInput
): Promise<ApplyResult> => {
  const result = emptyResult();
  const { sourceId, entityTypes, connectorId } = context;
  const reject = (item: string, reason: string) => result.rejected.push({ item, reason });
  const datasets = new Map(catalog.map((entry) => [entry.name, entry]));
  const ownDatasets = new Set(datasets.keys());
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  const profiledAt = (context.now ?? new Date()).toISOString();
  const typesBySlug = new Map(
    entityTypes.map((entityType) => [slugify(entityType.type), entityType])
  );

  const seenDatasets = new Set<string>();
  for (const change of changes.datasets) {
    const item = `dataset ${change.name}`;
    const entry = datasets.get(change.name);
    if (!entry) {
      reject(item, 'it is not a dataset of this source');
      continue;
    }
    if (seenDatasets.has(change.name)) {
      reject(item, 'it is listed twice');
      continue;
    }
    seenDatasets.add(change.name);
    const isConnector = entry.kind === 'connector';
    const kiId = datasetKiId(change.name);
    const profile = profilesByName.get(change.name);
    const esql = isConnector
      ? { dropped: change.access_patterns?.length ?? 0, patterns: [] }
      : await verifiedEsqlPatterns(context, change.access_patterns);
    const connector = isConnector
      ? await verifiedConnectorPatterns(context, change.connector_access_patterns)
      : { dropped: change.connector_access_patterns?.length ?? 0, patterns: [] };
    result.dropped_access_patterns += esql.dropped + connector.dropped;
    const written = await writeOntologyKi(context, kiId, (existing) => ({
      id: kiId,
      type: ONTOLOGY_DATASET_KI_TYPE,
      title: profile?.title ?? existing?.title ?? change.name,
      description: change.description,
      ...withPatterns(
        change.content,
        {
          ...existing?.attributes,
          [ONTOLOGY_INDEX_ATTRIBUTE]: change.name,
          [ONTOLOGY_KIND_ATTRIBUTE]: entry.kind,
          ...(!isConnector && { [ONTOLOGY_JOIN_FIELDS_ATTRIBUTE]: joinFieldsOf(entry) }),
          ...(isConnector &&
            connectorId !== undefined && {
              [ONTOLOGY_CONNECTOR_ID_ATTRIBUTE]: connectorId,
            }),
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
        esql.patterns ?? accessPatternsOf(existing),
        mergeConnectorPatterns(connectorPatternsOf(existing), connector.patterns, connectorId)
      ),
      references: addReferences(withSourceReference(existing?.references, sourceId, true), [
        ...roundReferences(change.source_round_ids),
      ]),
    }));
    if (written === 'foreign') {
      reject(item, 'its id belongs to a KI that is not part of the ontology');
    }
    count(result, written);
  }

  const seenTerms = new Set<string>();
  for (const change of changes.terms) {
    const proposedName = change.name.trim();
    const entityType = typesBySlug.get(slugify(proposedName));
    if (entityTypes.length > 0 && !entityType) {
      reject(`term ${proposedName}`, 'it is not a configured entity type');
      continue;
    }
    const name = entityType?.type ?? proposedName;
    const item = `term ${name}`;
    const kiId = termKiId(name);
    if (seenTerms.has(kiId)) {
      reject(item, 'it is listed twice');
      continue;
    }
    seenTerms.add(kiId);

    const { current, hidden } = await readCurrent(context, kiId);
    if (hidden) {
      continue;
    }
    if (current && current.type !== ONTOLOGY_TERM_KI_TYPE) {
      reject(item, 'its id belongs to a KI that is not part of the ontology');
      continue;
    }
    const currentFields = stringsOf(current?.attributes?.[ONTOLOGY_FIELDS_ATTRIBUTE]);
    const otherFields = currentFields.filter((value) => !ownDatasets.has(datasetOf(value) ?? ''));
    const ownFields = change.delete
      ? []
      : [
          ...new Set(
            (change.fields ?? []).flatMap((value) => {
              const parsed = parseTermField(value);
              const entry = parsed && datasets.get(parsed.dataset);
              return parsed && entry?.fields.some(({ name: field }) => field === parsed.field)
                ? [`${parsed.dataset}:${parsed.field}`]
                : [];
            })
          ),
        ];
    if (!change.delete && ownFields.length === 0 && !current) {
      reject(item, "it names no field of this source's datasets as <dataset>:<field>");
      continue;
    }
    const fields = [...new Set([...otherFields, ...ownFields])];
    const removedOwnDatasets = new Set(
      currentFields
        .filter((value) => ownDatasets.has(datasetOf(value) ?? ''))
        .map((value) => datasetOf(value) ?? '')
        .filter((dataset) => !ownFields.some((value) => datasetOf(value) === dataset))
    );
    for (const dataset of removedOwnDatasets) {
      count(result, await deleteOwnKi(context, storedInId(kiId, dataset)));
    }
    if (fields.length === 0) {
      if (current) {
        count(result, await deleteOwnKi(context, kiId));
      }
      continue;
    }

    const esql = await verifiedEsqlPatterns(context, change.access_patterns);
    const connector = await verifiedConnectorPatterns(context, change.connector_access_patterns);
    result.dropped_access_patterns += esql.dropped + connector.dropped;
    const description =
      entityType?.description ?? change.description ?? current?.description ?? undefined;
    const synonyms = uniqueSynonyms(
      name,
      change.synonyms ?? stringsOf(current?.attributes?.[ONTOLOGY_SYNONYMS_ATTRIBUTE])
    );
    const configuredAttributes = new Set(entityType?.attributes ?? []);
    const ownAttributeFields = (change.attributes ?? []).flatMap(({ attribute, field }) =>
      configuredAttributes.has(attribute) && ownFields.includes(field)
        ? [`${attribute}=${field}`]
        : []
    );
    const attributeFields = [
      ...stringsOf(current?.attributes?.[ONTOLOGY_ATTRIBUTE_FIELDS_ATTRIBUTE]).filter(
        (entry) => !ownDatasets.has(datasetOf(entry.split('=')[1] ?? '') ?? '')
      ),
      ...ownAttributeFields,
    ];
    const written = await writeOntologyKi(context, kiId, (existing) => {
      const {
        [ONTOLOGY_ENTITY_TYPE_ATTRIBUTE]: _entityType,
        [ONTOLOGY_ATTRIBUTE_FIELDS_ATTRIBUTE]: _attributeFields,
        ...attributes
      } = existing?.attributes ?? {};
      return {
        id: kiId,
        type: ONTOLOGY_TERM_KI_TYPE,
        title: entityType ? entityType.type : existing?.title ?? name,
        ...(description !== undefined && { description }),
        ...withPatterns(
          termContent(description, synonyms, fields),
          {
            ...attributes,
            [ONTOLOGY_SYNONYMS_ATTRIBUTE]: synonyms,
            [ONTOLOGY_FIELDS_ATTRIBUTE]: fields,
            ...(entityType && { [ONTOLOGY_ENTITY_TYPE_ATTRIBUTE]: entityType.type }),
            ...(attributeFields.length > 0 && {
              [ONTOLOGY_ATTRIBUTE_FIELDS_ATTRIBUTE]: attributeFields,
            }),
          },
          mergeEsqlPatterns(accessPatternsOf(existing), esql.patterns, ownDatasets),
          mergeConnectorPatterns(connectorPatternsOf(existing), connector.patterns, connectorId)
        ),
        references: withSourceReference(existing?.references, sourceId, ownFields.length > 0),
      };
    });
    if (written === 'foreign') {
      reject(item, 'its id belongs to a KI that is not part of the ontology');
      continue;
    }
    count(result, written);

    const title = entityType ? entityType.type : current?.title ?? name;
    for (const dataset of new Set(ownFields.map((value) => datasetOf(value) ?? ''))) {
      if (!(await ontologyKiExists(context, datasetKiId(dataset)))) {
        reject(
          `relationship ${title} ${STORED_IN_RELATIONSHIP_TYPE} ${dataset}`,
          'the dataset is not described yet'
        );
        continue;
      }
      const stored = ownFields
        .filter((value) => datasetOf(value) === dataset)
        .map((value) => parseTermField(value)?.field);
      count(
        result,
        await writeOntologyKi(
          context,
          storedInId(kiId, dataset),
          relationshipDocument({
            fromId: kiId,
            fromTitle: title,
            relation: STORED_IN_RELATIONSHIP_TYPE,
            toId: datasetKiId(dataset),
            toTitle: datasets.get(dataset)?.name ?? dataset,
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
    if (!ownDatasets.has(join.from_dataset) && !ownDatasets.has(join.to_dataset)) {
      reject(item, 'neither dataset is one of this source');
      continue;
    }
    if (!(await ontologyKiExists(context, fromId)) || !(await ontologyKiExists(context, toId))) {
      reject(item, 'a dataset is not described yet');
      continue;
    }
    count(
      result,
      await writeOntologyKi(
        context,
        relationshipId(relationshipKey(fromId, JOINS_WITH_RELATIONSHIP_TYPE, toId)),
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

  if (stale.length > 0) {
    await dropSourceDatasets(context, result, stale, { dropTermReferences: false });
  }

  return result;
};

/**
 * Removes what a source wrote, when it is no longer a source of the AI index: its datasets no
 * other source reads, their fields on terms, and its references.
 */
export const removeOntologySource = async (context: OntologyApplyContext): Promise<ApplyResult> => {
  const result = emptyResult();
  const { esClient, dest, spaceId, sourceId, abortSignal } = context;
  const datasetIds = (await readOntologyKis({ esClient, dest, spaceId, abortSignal }))
    .filter((ki) => ki.type === ONTOLOGY_DATASET_KI_TYPE && sourceIdsOf(ki).includes(sourceId))
    .map(({ id }) => id);
  await dropSourceDatasets(context, result, datasetIds, { dropTermReferences: true });
  return result;
};

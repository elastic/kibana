/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  ENTITY_TYPE_PREFIX,
  FACT_TYPE_PREFIX,
  LAST_SEEN_AT_ATTRIBUTE,
  OCCURRENCES_ATTRIBUTE,
  RELATIONSHIP_KEY_ATTRIBUTE,
  RELATIONSHIP_KI_TYPE,
  RELATIONSHIP_RELATION_ATTRIBUTE,
} from '../../common/dreaming';
import type { AccessPattern } from '../../common/step_types/apply_dream_changes';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { MAX_KI_REFERENCES } from '../../common/step_types/ki';
import { KiConflictError, KiNotFoundError } from '../ai_indices/errors';
import {
  findKiRevision,
  isKiDeleted,
  putKiRevision,
  type KiRevision,
  type KiWriter,
  type StoredKi,
} from '../ai_indices/ki_revision';
import { findLinkingRelationshipIds } from '../ai_indices/ki_relationships';
import { softDeleteKi } from '../ai_indices/ki_write';
import {
  accessPatternAttributes,
  accessPatternsOf,
  baseContent,
  renderContent,
  withoutAccessPatternAttributes,
} from './access_patterns';
import {
  citedMemoryIds,
  occurrencesOf,
  type DreamedKi,
  type DreamedKiAttributes,
  type DreamedKiReference,
} from './dreamed_ki';
import { kiUri, memoryUri } from './ids';
import {
  derivedPermissions,
  isVisibleInSpace,
  samePermissions,
  type KiPermissions,
} from './permissions';
import type {
  DeleteOperation,
  DreamingOperation,
  UpsertEntityOperation,
  UpsertFactOperation,
} from './resolve_change_set';
import type { RelationshipOperation, UpsertRelationshipOperation } from './resolve_relationships';

const WRITE_CONFLICT_RETRIES = 3;

export interface ApplyCounts {
  created: number;
  updated: number;
  deleted: number;
}

export interface ApplyResult extends ApplyCounts {
  /** Writes refused because the KI has different permissions than its memories. */
  rejected: Array<{ item: string; reason: string }>;
}

/** A KI a dry run would write, as it would be stored; `ki` is absent when it would be deleted. */
export interface PlannedWrite {
  change: 'created' | 'updated' | 'deleted';
  ki?: StoredKi;
}

export interface ApplyContext {
  esClient: ElasticsearchClient;
  aiIndexId: string;
  dest: AiIndexDest;
  writer: KiWriter;
  /** The space dreaming runs in: KIs it cannot see there are left alone. */
  spaceId: string;
  /** The permissions of each memory the model was shown. */
  memoryPermissions: ReadonlyMap<string, KiPermissions | undefined>;
  abortSignal?: AbortSignal;
  /** Collects the writes by KI id instead of storing them. */
  dryRun?: Map<string, PlannedWrite>;
  /** Collects each KI stored, by id. */
  written?: Map<string, StoredKi>;
  /** Writes without waiting for a refresh. Each KI must be written at most once. */
  skipRefresh?: boolean;
}

const referenceKey = ({ uri, relation, description }: DreamedKiReference): string =>
  `${relation ?? ''}\u0000${relation === 'relates_to' ? description ?? '' : ''}\u0000${uri}`;

/** Adds references without duplicates, dropping the oldest `derived_from` ones over the cap. */
export const addReferences = (
  current: readonly DreamedKiReference[] | undefined,
  additions: readonly DreamedKiReference[]
): DreamedKiReference[] => {
  const byKey = new Map<string, DreamedKiReference>();
  for (const reference of [...(current ?? []), ...additions]) {
    byKey.set(referenceKey(reference), byKey.get(referenceKey(reference)) ?? reference);
  }
  const references = [...byKey.values()];
  while (references.length > MAX_KI_REFERENCES) {
    const index = references.findIndex(({ relation }) => relation === 'derived_from');
    if (index === -1) {
      break;
    }
    references.splice(index, 1);
  }
  return references.slice(-MAX_KI_REFERENCES);
};

const sourceReferences = (sourceMemoryIds: readonly string[]): DreamedKiReference[] =>
  sourceMemoryIds.map((id) => ({ uri: memoryUri(id), relation: 'derived_from' }));

/** Builds the KI to store; undefined when it would not change. */
type BuildDocument = (current: DreamedKi | undefined) => Omit<DreamedKi, 'governance'> | undefined;

type BuildPermittedDocument = (
  current: DreamedKi | undefined
) => Omit<DreamedKi, 'governance'> | 'rejected' | undefined;

type WriteResult = 'created' | 'updated' | 'skipped' | 'rejected';

const activeSource = (revision: KiRevision | undefined): DreamedKi | undefined => {
  const source = revision?.source as DreamedKi | undefined;
  return source && !isKiDeleted(source) ? source : undefined;
};

const storedDocument = (
  document: Omit<DreamedKi, 'governance'>,
  kiId: string,
  current: DreamedKi | undefined,
  writer: KiWriter
): StoredKi => {
  const now = new Date().toISOString();
  return {
    ...document,
    '@timestamp': now,
    id: kiId,
    updated_at: now,
    governance: {
      provenance: {
        created_by: current?.governance?.provenance?.created_by ?? writer,
        updated_by: writer,
      },
      lifecycle: { status: 'active' },
    },
  } satisfies StoredKi;
};

const hiddenFrom = ({ spaceId }: ApplyContext, revision: KiRevision | undefined): boolean => {
  const source = revision?.source as DreamedKi | undefined;
  return source !== undefined && !isVisibleInSpace(source.permissions, spaceId);
};

/** The permissions of the batch's memories, which all share them. */
const batchPermissions = ({
  spaceId,
  memoryPermissions,
}: ApplyContext): KiPermissions | undefined =>
  derivedPermissions([...memoryPermissions.values()], spaceId);

const withDerivedPermissions =
  (
    context: ApplyContext,
    sourceMemoryIds: readonly string[],
    build: BuildDocument
  ): BuildPermittedDocument =>
  (current) => {
    const { spaceId, memoryPermissions } = context;
    const cited = new Set(current ? citedMemoryIds(current) : []);
    const sources = sourceMemoryIds.filter((id) => memoryPermissions.has(id) || !cited.has(id));
    const permissions =
      sources.length > 0
        ? derivedPermissions(
            sources.map((id) => memoryPermissions.get(id)),
            spaceId
          )
        : batchPermissions(context);
    if (current && !samePermissions(current.permissions, permissions)) {
      return 'rejected';
    }
    const document = build(current);
    return document && permissions ? { ...document, permissions } : document;
  };

const planDocument = async (
  context: ApplyContext,
  planned: Map<string, PlannedWrite>,
  kiId: string,
  build: BuildPermittedDocument
): Promise<WriteResult> => {
  const { esClient, aiIndexId, dest, writer, abortSignal } = context;
  const previous = planned.get(kiId);
  const revision = previous
    ? undefined
    : await findKiRevision({ esClient, aiIndexId, dest, kiId, includeSource: true, abortSignal });
  if (hiddenFrom(context, revision)) {
    return 'skipped';
  }
  const current = previous ? (previous.ki as DreamedKi | undefined) : activeSource(revision);
  const document = build(current);
  if (document === 'rejected') {
    return document;
  }
  if (!document) {
    return 'skipped';
  }
  planned.set(kiId, {
    change: previous?.change === 'created' || !current ? 'created' : 'updated',
    ki: storedDocument(document, kiId, current, writer),
  });
  return current ? 'updated' : 'created';
};

const writeDocument = async (
  context: ApplyContext,
  kiId: string,
  sourceMemoryIds: readonly string[],
  buildDocument: BuildDocument
): Promise<WriteResult> => {
  const { esClient, aiIndexId, dest, writer, abortSignal, dryRun, written, skipRefresh } = context;
  const build = withDerivedPermissions(context, sourceMemoryIds, buildDocument);
  if (dryRun) {
    return planDocument(context, dryRun, kiId, build);
  }
  return pRetry(
    async () => {
      const revision = await findKiRevision({
        esClient,
        aiIndexId,
        dest,
        kiId,
        includeSource: true,
        abortSignal,
      });
      if (hiddenFrom(context, revision)) {
        return 'skipped' as const;
      }
      const current = activeSource(revision);
      const document = build(current);
      if (document === 'rejected') {
        return document;
      }
      if (!document) {
        return 'skipped' as const;
      }
      const stored = storedDocument(document, kiId, current, writer);
      await putKiRevision({
        esClient,
        aiIndexId,
        dest,
        kiId,
        document: stored,
        existing: dest.type === 'data_stream' ? undefined : revision,
        failIfExists: revision === undefined,
        refresh: !skipRefresh,
        abortSignal,
      });
      written?.set(kiId, stored);
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

const latest = (...dates: Array<string | undefined>): string | undefined =>
  dates
    .filter((date): date is string => date !== undefined && !Number.isNaN(Date.parse(date)))
    .sort((a, b) => Date.parse(a) - Date.parse(b))
    .pop();

const sightingAttributes = (
  current: DreamedKi | undefined,
  sourceMemoryIds: readonly string[],
  lastSeenAt: string | undefined
): DreamedKiAttributes => {
  const cited = new Set(current ? citedMemoryIds(current) : []);
  const seenAgain = new Set(sourceMemoryIds.filter((id) => !cited.has(id))).size;
  const currentLastSeenAt = current?.attributes?.[LAST_SEEN_AT_ATTRIBUTE];
  const lastSeen = latest(
    typeof currentLastSeenAt === 'string' ? currentLastSeenAt : undefined,
    lastSeenAt
  );
  return {
    [OCCURRENCES_ATTRIBUTE]: occurrencesOf(current) + seenAgain,
    ...(lastSeen !== undefined && { [LAST_SEEN_AT_ATTRIBUTE]: lastSeen }),
  };
};

const withAccessPatterns = (
  current: DreamedKi | undefined,
  content: string | undefined,
  accessPatterns: AccessPattern[] | undefined,
  attributes: DreamedKiAttributes
): Pick<DreamedKi, 'content' | 'attributes'> => {
  const patterns = accessPatterns ?? accessPatternsOf(current);
  const rendered = renderContent(content ?? baseContent(current?.content), patterns);
  return {
    ...(rendered !== undefined && { content: rendered }),
    attributes: {
      ...withoutAccessPatternAttributes(attributes),
      ...accessPatternAttributes(patterns),
    },
  };
};

const upsertEntity = (context: ApplyContext, operation: UpsertEntityOperation) =>
  writeDocument(context, operation.id, operation.sourceMemoryIds, (current) => ({
    ...current,
    id: operation.id,
    type: `${ENTITY_TYPE_PREFIX}${operation.type}`,
    title: operation.title,
    ...(operation.description !== undefined && { description: operation.description }),
    ...withAccessPatterns(current, operation.content, operation.accessPatterns, {
      ...current?.attributes,
      ...operation.attributes,
      ...sightingAttributes(current, operation.sourceMemoryIds, operation.lastSeenAt),
    }),
    references: addReferences(current?.references, sourceReferences(operation.sourceMemoryIds)),
  }));

const upsertFact = (context: ApplyContext, operation: UpsertFactOperation) =>
  writeDocument(context, operation.id, operation.sourceMemoryIds, (current) => ({
    ...current,
    id: operation.id,
    type: `${FACT_TYPE_PREFIX}${operation.type}`,
    title: operation.title,
    ...withAccessPatterns(current, operation.content, operation.accessPatterns, {
      ...current?.attributes,
      ...sightingAttributes(current, operation.sourceMemoryIds, operation.lastSeenAt),
    }),
    references: addReferences(current?.references, sourceReferences(operation.sourceMemoryIds)),
  }));

const relationshipTitle = ({ from, relation, to }: UpsertRelationshipOperation): string =>
  `${from.title} ${relation.replace(/_/g, ' ')} ${to.title}`;

const upsertRelationship = (context: ApplyContext, operation: UpsertRelationshipOperation) =>
  writeDocument(context, operation.id, operation.sourceMemoryIds, (current) => {
    const title = relationshipTitle(operation);
    const description = operation.description ?? current?.description;
    const cited = new Set(current ? citedMemoryIds(current) : []);
    if (
      current?.title === title &&
      current.description === description &&
      operation.sourceMemoryIds.every((id) => cited.has(id))
    ) {
      return undefined;
    }
    return {
      ...current,
      id: operation.id,
      type: RELATIONSHIP_KI_TYPE,
      title,
      ...(description !== undefined && { description }),
      content: description !== undefined ? `${title}.\n${description}` : `${title}.`,
      attributes: {
        ...current?.attributes,
        [RELATIONSHIP_RELATION_ATTRIBUTE]: operation.relation,
        [RELATIONSHIP_KEY_ATTRIBUTE]: operation.key,
      },
      references: addReferences(current?.references, [
        { uri: kiUri(operation.from.id), relation: 'relates_to', description: 'from' },
        { uri: kiUri(operation.to.id), relation: 'relates_to', description: 'to' },
        ...sourceReferences(operation.sourceMemoryIds),
      ]),
    };
  });

type UpsertOperation = Exclude<DreamingOperation | RelationshipOperation, DeleteOperation>;

const rejectedItemOf = (operation: UpsertOperation): string => {
  switch (operation.op) {
    case 'upsert_entity':
      return `entity ${operation.id}`;
    case 'upsert_fact':
      return `fact ${operation.id}`;
    case 'upsert_relationship':
      return `relationship ${operation.from.id} ${operation.relation} ${operation.to.id}`;
  }
};

const upsert = (context: ApplyContext, operation: UpsertOperation): Promise<WriteResult> => {
  switch (operation.op) {
    case 'upsert_entity':
      return upsertEntity(context, operation);
    case 'upsert_fact':
      return upsertFact(context, operation);
    case 'upsert_relationship':
      return upsertRelationship(context, operation);
  }
};

type DeleteResult = 'deleted' | 'skipped' | 'rejected';

/** Whether this batch may delete a KI: it exists, and has the permissions of the batch's memories. */
const deletable = async (
  context: ApplyContext,
  kiId: string
): Promise<'allowed' | Exclude<DeleteResult, 'deleted'>> => {
  const { esClient, aiIndexId, dest, abortSignal } = context;
  const revision = await findKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    includeSource: true,
    abortSignal,
  });
  if (revision === undefined || hiddenFrom(context, revision)) {
    return 'skipped';
  }
  const { permissions } = revision.source as DreamedKi;
  return samePermissions(permissions, batchPermissions(context)) ? 'allowed' : 'rejected';
};

const planDelete = async (
  context: ApplyContext,
  planned: Map<string, PlannedWrite>,
  kiId: string
): Promise<DeleteResult> => {
  const check = planned.has(kiId) ? 'allowed' : await deletable(context, kiId);
  if (check !== 'allowed') {
    return check;
  }
  planned.set(kiId, { change: 'deleted' });
  return 'deleted';
};

const deleteDocument = async (context: ApplyContext, kiId: string): Promise<DeleteResult> => {
  const { esClient, aiIndexId, dest, writer, abortSignal, dryRun, skipRefresh } = context;
  if (dryRun) {
    return planDelete(context, dryRun, kiId);
  }
  const check = await deletable(context, kiId);
  if (check !== 'allowed') {
    return check;
  }
  try {
    await softDeleteKi(esClient, {
      aiIndexId,
      dest,
      kiId,
      writer,
      refresh: !skipRefresh,
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

/** Deletes a KI, and the relationships that link it. */
const deleteKi = async (context: ApplyContext, kiId: string): Promise<DeleteResult> => {
  const { esClient, dest, abortSignal, dryRun } = context;
  const deleted = await deleteDocument(context, kiId);
  if (deleted !== 'deleted' || !dryRun) {
    return deleted;
  }
  for (const relationshipId of await findLinkingRelationshipIds({
    esClient,
    dest,
    kiId,
    abortSignal,
  })) {
    dryRun.set(relationshipId, { change: 'deleted' });
  }
  return 'deleted';
};

/** Applies dreaming operations in order. */
export const applyOperations = async (
  context: ApplyContext,
  operations: ReadonlyArray<DreamingOperation | RelationshipOperation>
): Promise<ApplyResult> => {
  const result: ApplyResult = { created: 0, updated: 0, deleted: 0, rejected: [] };
  for (const operation of operations) {
    if (operation.op === 'delete') {
      const deleted = await deleteKi(context, operation.id);
      if (deleted === 'rejected') {
        result.rejected.push({
          item: `delete ${operation.id}`,
          reason: "it has different permissions than this batch's memories",
        });
      } else if (deleted === 'deleted') {
        result.deleted += 1;
      }
      continue;
    }
    const written = await upsert(context, operation);
    if (written === 'rejected') {
      result.rejected.push({
        item: rejectedItemOf(operation),
        reason: 'it has different permissions than its memories',
      });
    } else if (written !== 'skipped') {
      result[written] += 1;
    }
  }
  return result;
};

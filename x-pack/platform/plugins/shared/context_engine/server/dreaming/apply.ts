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
  PROCEDURE_TYPE_PREFIX,
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
import { kiUri } from './ids';
import { derivedPermissions, isVisibleInSpace, type KiPermissions } from './permissions';
import type {
  DeleteOperation,
  DreamingOperation,
  UpsertEntityOperation,
  UpsertFactOperation,
  UpsertProcedureOperation,
} from './resolve_change_set';

const WRITE_CONFLICT_RETRIES = 3;

export interface ApplyCounts {
  created: number;
  updated: number;
  deleted: number;
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
}

const referenceKey = ({ uri, relation }: DreamedKiReference): string =>
  `${relation ?? ''}\u0000${uri}`;

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
  sourceMemoryIds.map((id) => ({ uri: kiUri(id), relation: 'derived_from' }));

type BuildDocument = (current: DreamedKi | undefined) => Omit<DreamedKi, 'governance'> | undefined;

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

const withDerivedPermissions =
  (
    { spaceId, memoryPermissions }: ApplyContext,
    sourceMemoryIds: readonly string[],
    build: BuildDocument
  ): BuildDocument =>
  (current) => {
    const document = build(current);
    if (!document) {
      return undefined;
    }
    const permissions = derivedPermissions(
      [current?.permissions, ...sourceMemoryIds.map((id) => memoryPermissions.get(id))],
      spaceId
    );
    return permissions ? { ...document, permissions } : document;
  };

const planDocument = async (
  context: ApplyContext,
  planned: Map<string, PlannedWrite>,
  kiId: string,
  build: BuildDocument
): Promise<'created' | 'updated' | 'skipped'> => {
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
): Promise<'created' | 'updated' | 'skipped'> => {
  const { esClient, aiIndexId, dest, writer, abortSignal, dryRun } = context;
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
      if (!document) {
        return 'skipped' as const;
      }
      await putKiRevision({
        esClient,
        aiIndexId,
        dest,
        kiId,
        document: storedDocument(document, kiId, current, writer),
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

/** Whether a KI already cites every memory, so writing it again would add nothing. */
const citesAll = (current: DreamedKi | undefined, sourceMemoryIds: readonly string[]): boolean => {
  if (!current) {
    return false;
  }
  const cited = new Set(citedMemoryIds(current));
  return sourceMemoryIds.every((id) => cited.has(id));
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
  writeDocument(context, operation.id, operation.sourceMemoryIds, (current) =>
    citesAll(current, operation.sourceMemoryIds)
      ? undefined
      : {
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
          references: addReferences(
            current?.references,
            sourceReferences(operation.sourceMemoryIds)
          ),
        }
  );

const upsertFact = (context: ApplyContext, operation: UpsertFactOperation) =>
  writeDocument(context, operation.id, operation.sourceMemoryIds, (current) =>
    citesAll(current, operation.sourceMemoryIds)
      ? undefined
      : {
          ...current,
          id: operation.id,
          type: `${FACT_TYPE_PREFIX}${operation.type}`,
          title: operation.title,
          ...withAccessPatterns(current, operation.content, operation.accessPatterns, {
            ...current?.attributes,
            ...sightingAttributes(current, operation.sourceMemoryIds, operation.lastSeenAt),
          }),
          references: addReferences(
            current?.references,
            sourceReferences(operation.sourceMemoryIds)
          ),
        }
  );

const upsertProcedure = (context: ApplyContext, operation: UpsertProcedureOperation) =>
  writeDocument(context, operation.id, operation.sourceMemoryIds, (current) =>
    citesAll(current, operation.sourceMemoryIds)
      ? undefined
      : {
          ...current,
          id: operation.id,
          type: `${PROCEDURE_TYPE_PREFIX}${operation.type}`,
          title: operation.title,
          ...(operation.description !== undefined && { description: operation.description }),
          content: operation.content,
          attributes: {
            ...current?.attributes,
            ...sightingAttributes(current, operation.sourceMemoryIds, operation.lastSeenAt),
          },
          references: addReferences(
            current?.references,
            sourceReferences(operation.sourceMemoryIds)
          ),
        }
  );

const upsert = (
  context: ApplyContext,
  operation: Exclude<DreamingOperation, DeleteOperation>
): Promise<'created' | 'updated' | 'skipped'> => {
  switch (operation.op) {
    case 'upsert_entity':
      return upsertEntity(context, operation);
    case 'upsert_fact':
      return upsertFact(context, operation);
    case 'upsert_procedure':
      return upsertProcedure(context, operation);
  }
};

const deletable = async (context: ApplyContext, kiId: string): Promise<boolean> => {
  const { esClient, aiIndexId, dest, abortSignal } = context;
  const revision = await findKiRevision({
    esClient,
    aiIndexId,
    dest,
    kiId,
    includeSource: true,
    abortSignal,
  });
  return revision !== undefined && !hiddenFrom(context, revision);
};

const planDelete = async (
  context: ApplyContext,
  planned: Map<string, PlannedWrite>,
  kiId: string
): Promise<boolean> => {
  const exists = planned.has(kiId) || (await deletable(context, kiId));
  if (exists) {
    planned.set(kiId, { change: 'deleted' });
  }
  return exists;
};

const deleteKi = async (context: ApplyContext, kiId: string): Promise<boolean> => {
  const { esClient, aiIndexId, dest, writer, abortSignal, dryRun } = context;
  if (dryRun) {
    return planDelete(context, dryRun, kiId);
  }
  if (!(await deletable(context, kiId))) {
    return false;
  }
  try {
    await softDeleteKi(esClient, { aiIndexId, dest, kiId, writer, refresh: true, abortSignal });
    return true;
  } catch (error) {
    if (error instanceof KiNotFoundError) {
      return false;
    }
    throw error;
  }
};

/** Applies dreaming operations in order. */
export const applyOperations = async (
  context: ApplyContext,
  operations: readonly DreamingOperation[]
): Promise<ApplyCounts> => {
  const counts: ApplyCounts = { created: 0, updated: 0, deleted: 0 };
  for (const operation of operations) {
    if (operation.op === 'delete') {
      if (await deleteKi(context, operation.id)) {
        counts.deleted += 1;
      }
      continue;
    }
    const result = await upsert(context, operation);
    if (result !== 'skipped') {
      counts[result] += 1;
    }
  }
  return counts;
};

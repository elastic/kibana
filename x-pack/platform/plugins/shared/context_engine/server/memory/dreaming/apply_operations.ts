/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  LONG_TERM_MEMORY_AI_INDEX_ID,
  LONG_TERM_MEMORY_INDEX,
  MEMORY_ATTRIBUTES,
  SHORT_TERM_MEMORY_AI_INDEX_ID,
} from '../../../common/memory';
import type { MemoryReference, StoredMemoryDocument } from '../memory_document';
import {
  buildKiUri,
  createSpacePermissions,
  isActiveMemory,
  updateMemoryProvenance,
} from '../memory_document';
import { buildActiveLongTermFilter } from './candidates';
import { updateLinksOfEnd } from './links';
import type {
  DreamApplyContext,
  DreamOperation,
  LongTermMemoryTypeDefinition,
  PreparedMemory,
} from './long_term_types';
import { RELATIONSHIP_ENDPOINT_TYPES } from './relationship_type';

/** Caps provenance so a memory reinforced by many sessions stays a reasonable size. */
const MAX_DERIVED_FROM_REFERENCES = 50;
const CONFLICT_RETRIES = 2;

interface StoredLongTermMemory {
  document: StoredMemoryDocument;
  seqNo: number;
  primaryTerm: number;
}

export interface ApplyDreamOperationsParams {
  esClient: ElasticsearchClient;
  spaceId: string;
  definition: LongTermMemoryTypeDefinition;
  operations: DreamOperation[];
  /** The short-term memories the operations may cite, by id. */
  sources: Map<string, StoredMemoryDocument>;
  context: DreamApplyContext;
  logger: Logger;
  generateId: () => string;
}

export interface ApplyDreamOperationsResult {
  applied: number;
  skipped: number;
}

const isConflict = (error: unknown) => isResponseError(error) && error.statusCode === 409;

const derivedFrom = (ids: string[]): MemoryReference[] =>
  ids.map((id) => ({
    uri: buildKiUri(SHORT_TERM_MEMORY_AI_INDEX_ID, id),
    relation: 'derived_from',
  }));

const mergeReferences = (
  existing: MemoryReference[] | undefined,
  added: MemoryReference[]
): MemoryReference[] => {
  const kept = existing ?? [];
  const seen = new Set(kept.map(({ uri, relation }) => `${relation}:${uri}`));
  const merged = [...kept, ...added.filter(({ uri, relation }) => !seen.has(`${relation}:${uri}`))];
  const others = merged.filter(({ relation }) => relation !== 'derived_from');
  const derived = merged.filter(({ relation }) => relation === 'derived_from');
  return [...others, ...derived.slice(-MAX_DERIVED_FROM_REFERENCES)];
};

const maxTimestamp = (a: string | undefined, b: string): string =>
  a === undefined || new Date(b).getTime() > new Date(a).getTime() ? b : a;

/** Applies a dream's operations to the long-term store. Invalid operations are skipped. */
export const applyDreamOperations = async ({
  esClient,
  spaceId,
  definition,
  operations,
  sources,
  context,
  logger,
  generateId,
}: ApplyDreamOperationsParams): Promise<ApplyDreamOperationsResult> => {
  const { now, writer } = context;
  const allowedOperations = new Set(definition.operations);
  const isLinkEnd = RELATIONSHIP_ENDPOINT_TYPES.includes(definition.type);
  const result: ApplyDreamOperationsResult = { applied: 0, skipped: 0 };

  const skip = (operation: DreamOperation, why: string) => {
    result.skipped++;
    logger.debug(
      `Skipped dream operation '${operation.op}' on ${definition.type}${
        operation.target_id ? ` '${operation.target_id}'` : ''
      }: ${why}`
    );
  };

  const getLive = async (id: string): Promise<StoredLongTermMemory | undefined> => {
    try {
      const response = await esClient.get<StoredMemoryDocument>({
        index: LONG_TERM_MEMORY_INDEX,
        id,
      });
      const document = response._source;
      if (
        !document ||
        response._seq_no === undefined ||
        response._primary_term === undefined ||
        !document.permissions?.kibana.privileges.some(({ space }) => space === spaceId) ||
        !isActiveMemory(document, new Date(now))
      ) {
        return undefined;
      }
      return { document, seqNo: response._seq_no, primaryTerm: response._primary_term };
    } catch (error) {
      if (isResponseError(error) && error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  };

  const getTarget = async (id: string): Promise<StoredLongTermMemory | undefined> => {
    const target = await getLive(id);
    return target?.document.type === definition.type ? target : undefined;
  };

  const getLiveMemory = async (id: string) => (await getLive(id))?.document;

  const findActiveByKey = async (key: string): Promise<string | undefined> => {
    const response = await esClient.search<StoredMemoryDocument>({
      index: LONG_TERM_MEMORY_INDEX,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 1,
      _source: false,
      query: {
        bool: {
          filter: [
            ...buildActiveLongTermFilter({ spaceId, types: [definition.type], now }),
            { term: { [`attributes.${MEMORY_ATTRIBUTES.key}`]: key } },
          ],
        },
      },
    });
    return response.hits.hits[0]?._id;
  };

  /** Re-reads the target and retries when another writer got there first. */
  const updateTarget = async (
    targetId: string,
    update: (target: StoredMemoryDocument) => StoredMemoryDocument | undefined
  ): Promise<boolean> => {
    for (let attempt = 0; attempt <= CONFLICT_RETRIES; attempt++) {
      const target = await getTarget(targetId);
      if (!target) {
        return false;
      }
      const document = update(target.document);
      if (!document) {
        return false;
      }
      try {
        await esClient.index({
          index: LONG_TERM_MEMORY_INDEX,
          id: targetId,
          document,
          if_seq_no: target.seqNo,
          if_primary_term: target.primaryTerm,
          refresh: 'wait_for',
        });
        return true;
      } catch (error) {
        if (!isConflict(error) || attempt === CONFLICT_RETRIES) {
          throw error;
        }
      }
    }
    return false;
  };

  const updateLinks = async (endId: string, replacement?: StoredMemoryDocument) => {
    if (!isLinkEnd) {
      return;
    }
    const updated = await updateLinksOfEnd({
      esClient,
      spaceId,
      endId,
      replacement,
      getLiveMemory,
      context,
      logger,
    });
    if (updated > 0) {
      logger.debug(
        `${replacement ? 'Moved' : 'Outdated'} ${updated} relationships of ${
          definition.type
        } '${endId}'`
      );
    }
  };

  const tombstone = (document: StoredMemoryDocument): StoredMemoryDocument => ({
    ...document,
    updated_at: now,
    governance: {
      ...updateMemoryProvenance(document.governance, writer, false),
      lifecycle: { ...document.governance?.lifecycle, status: 'deleted' },
    },
  });

  const reinforce = (target: StoredMemoryDocument, sourceDocs: StoredMemoryDocument[]) => {
    const lastSeenAt = sourceDocs.reduce<string | undefined>(
      (latest, source) => maxTimestamp(latest, source['@timestamp']),
      target.attributes?.[MEMORY_ATTRIBUTES.lastSeenAt] as string | undefined
    );
    return {
      ...target,
      updated_at: now,
      references: mergeReferences(target.references, derivedFrom(sourceDocs.map(({ id }) => id))),
      attributes: {
        ...target.attributes,
        ...(lastSeenAt !== undefined && { [MEMORY_ATTRIBUTES.lastSeenAt]: lastSeenAt }),
      },
      governance: updateMemoryProvenance(target.governance, writer, false),
    };
  };

  const create = async (
    operation: DreamOperation,
    prepared: PreparedMemory,
    sourceDocs: StoredMemoryDocument[],
    extraReferences: MemoryReference[] = []
  ): Promise<StoredMemoryDocument> => {
    const timestamps = sourceDocs.map((source) => source['@timestamp']).sort();
    const id = generateId();
    const document: StoredMemoryDocument = {
      '@timestamp': now,
      id,
      type: definition.type,
      title: prepared.title,
      description: prepared.description,
      content: prepared.content,
      ...(operation.tags !== undefined && { tags: operation.tags }),
      updated_at: now,
      references: [
        ...extraReferences,
        ...(prepared.references ?? []),
        ...derivedFrom(sourceDocs.map((source) => source.id)),
      ],
      attributes: {
        [MEMORY_ATTRIBUTES.key]: prepared.key,
        [MEMORY_ATTRIBUTES.firstSeenAt]: timestamps[0] ?? now,
        [MEMORY_ATTRIBUTES.lastSeenAt]: timestamps[timestamps.length - 1] ?? now,
        ...definition.initialAttributes(context),
        ...prepared.attributes,
      },
      governance: {
        provenance: { created_by: writer, updated_by: writer },
        lifecycle: { status: 'active' },
      },
      permissions: createSpacePermissions(spaceId),
    };
    await esClient.index({
      index: LONG_TERM_MEMORY_INDEX,
      id,
      document,
      op_type: 'create',
      refresh: 'wait_for',
    });
    return document;
  };

  for (const operation of operations) {
    if (!allowedOperations.has(operation.op)) {
      skip(operation, 'the type does not support it');
      continue;
    }
    const sourceDocs = (operation.source_ids ?? []).flatMap((id) => {
      const source = sources.get(id);
      return source ? [source] : [];
    });
    if (sourceDocs.length === 0) {
      skip(operation, 'it cites no short-term memory from this dream');
      continue;
    }

    if (operation.op === 'create') {
      const prepared = await definition.prepare(operation, { getLiveMemory });
      if (!prepared.ok) {
        skip(operation, prepared.reason);
        continue;
      }
      const existingId = await findActiveByKey(prepared.memory.key);
      if (existingId) {
        const reinforced = await updateTarget(existingId, (target) =>
          reinforce(target, sourceDocs)
        );
        if (reinforced) {
          result.applied++;
          continue;
        }
      }
      await create(operation, prepared.memory, sourceDocs);
      result.applied++;
      continue;
    }

    const targetId = operation.target_id;
    if (!targetId) {
      skip(operation, 'it has no target_id');
      continue;
    }

    let applied = false;
    let skipReason: string | undefined;
    switch (operation.op) {
      case 'reinforce':
        applied = await updateTarget(targetId, (target) => reinforce(target, sourceDocs));
        break;
      case 'outdate':
        applied = await updateTarget(targetId, (target) => ({
          ...target,
          expires_at: now,
          updated_at: now,
          governance: updateMemoryProvenance(target.governance, writer, false),
        }));
        if (applied) {
          await updateLinks(targetId);
        }
        break;
      case 'supersede': {
        const target = await getTarget(targetId);
        if (!target) {
          break;
        }
        const prepared = await definition.prepare(operation, {
          target: target.document,
          getLiveMemory,
        });
        if (!prepared.ok) {
          skipReason = prepared.reason;
          break;
        }
        applied = await updateTarget(targetId, tombstone);
        if (applied) {
          const replacement = await create(operation, prepared.memory, sourceDocs, [
            { uri: buildKiUri(LONG_TERM_MEMORY_AI_INDEX_ID, targetId), relation: 'supersedes' },
          ]);
          await updateLinks(targetId, replacement);
        }
        break;
      }
      default: {
        let tombstoned = false;
        applied = await updateTarget(targetId, (target) => {
          const outcome = definition.applyOperation?.(operation, target, context);
          if (!outcome || outcome.kind === 'skip') {
            skipReason = outcome?.reason;
            return undefined;
          }
          tombstoned = outcome.kind === 'tombstone';
          return tombstoned ? tombstone(outcome.document) : outcome.document;
        });
        if (applied && tombstoned) {
          await updateLinks(targetId);
        }
      }
    }

    if (applied) {
      result.applied++;
    } else {
      skip(operation, skipReason ?? 'the target is not a live memory of this type in this space');
    }
  }

  return result;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamClient } from '@kbn/data-streams';
import type { MemoryDocument, MemoryStorage } from '../storage/memory_storage';
import type { MemoryHistoryRecord, agentMemoryHistoryMappings } from '../storage/history_stream';
import type { ResolvedIdentity } from './resolve_identity';

export interface TombstoneMemoryParams {
  /** The `agent-memory` document id to soft-delete. */
  id: string;
  space_id: string;
  identity: ResolvedIdentity;
  call_source?: string;
}

export interface TombstoneMemoryResult {
  /** `deleted` when found and tombstoned, `not_found` otherwise. */
  result: 'deleted' | 'not_found';
}

/**
 * Soft-deletes a memory by setting `deleted: true` in place.
 *
 * The document is never hard-deleted. This bounds blast radius if the authz
 * gate is ever bypassed, and preserves the audit trail. Memories excluded from
 * recall results because `deleted === true` are still visible in ES|QL for
 * admin inspection and can be physically removed via Index Management.
 *
 * Validates that the caller owns the memory (matching `space_id` and `author`)
 * before applying the tombstone.
 */
export const tombstoneMemory = async ({
  storage,
  historyClient,
  params,
}: {
  storage: MemoryStorage;
  historyClient: DataStreamClient<typeof agentMemoryHistoryMappings>;
  params: TombstoneMemoryParams;
}): Promise<TombstoneMemoryResult> => {
  const { id, space_id, identity, call_source } = params;
  const client = storage.getClient();
  const now = new Date().toISOString();

  // Fetch the doc to confirm ownership before mutating it.
  let existing: MemoryDocument | undefined;
  let seqNo: number | undefined;
  let primaryTerm: number | undefined;
  try {
    const hit = await client.get({ id, _source: true });
    if (!hit.found) {
      return { result: 'not_found' };
    }
    // The storage adapter returns the _source as the mapped document type.
    existing = hit._source as MemoryDocument;
    seqNo = hit._seq_no;
    primaryTerm = hit._primary_term;
  } catch {
    return { result: 'not_found' };
  }

  if (!existing) {
    return { result: 'not_found' };
  }

  // Ownership gate: author + space must match.
  const author = existing.memory?.provenance?.author;
  const docSpaceId = existing.space_id;
  if (author !== identity.author || docSpaceId !== space_id) {
    // Treat as not-found to avoid leaking existence of foreign memories.
    return { result: 'not_found' };
  }

  const updated: MemoryDocument = {
    ...existing,
    deleted: true,
  };

  // OCC guard: reject if a concurrent write landed between our get and
  // this index. Let the error propagate; the caller can surface it.
  await client.index({
    id,
    document: updated,
    ...(seqNo !== undefined && primaryTerm !== undefined
      ? { if_seq_no: seqNo, if_primary_term: primaryTerm }
      : {}),
  });

  try {
    await historyClient.create({
      documents: [
        {
          '@timestamp': now,
          memory_id: id,
          event_type: 'tombstone' as MemoryHistoryRecord['event_type'],
          revision: existing.memory?.revision ?? 0,
          space_id,
          author: identity.author,
          author_kind: identity.author_kind,
          ...(call_source ? { call_source } : {}),
        },
      ],
    });
  } catch {
    // best-effort
  }

  return { result: 'deleted' };
};

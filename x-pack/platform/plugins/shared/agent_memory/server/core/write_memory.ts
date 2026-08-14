/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type { DataStreamClient } from '@kbn/data-streams';
import type { CallSource, MemoryCategory, MemoryType } from '../storage/memory_storage';
import type { MemoryDocument, MemoryStorage } from '../storage/memory_storage';
import type { MemoryHistoryRecord, agentMemoryHistoryMappings } from '../storage/history_stream';
import type { ResolvedIdentity } from './resolve_identity';

export interface WriteMemoryParams {
  /** Short label — displayed to the user and used in the BM25 recall leg. */
  title: string;
  /** Full content of the memory. SHA-256 of the normalised form drives dedup. */
  description: string;
  category?: MemoryCategory;
  type?: MemoryType;
  tags?: string[];
  entities?: string[];
  /** ISO timestamp; optional per-record soft expiry (D5). */
  expires_at?: string;
  origin?: string;
  assurance?: string;
  call_source?: CallSource;
  conversation_ids?: string[];
  trace_ids?: string[];
  space_id: string;
  identity: ResolvedIdentity;
}

export interface WriteMemoryResult {
  /** The Agent Memory document ID. */
  id: string;
  revision: number;
  /** Whether this was a new memory (`created`) or an in-place supersession (`updated`). */
  action: 'created' | 'updated';
}

/**
 * Normalises the description before hashing: collapse runs of whitespace and
 * trim leading/trailing space. This makes semantic duplicates (same text,
 * different whitespace) collapse to a single memory.
 */
const normalise = (text: string): string => text.replace(/\s+/g, ' ').trim();

const contentHash = (description: string): string =>
  createHash('sha256').update(normalise(description)).digest('hex');

/**
 * Creates a new memory or supersedes an existing one with the same content
 * (same description, same author, same space).
 *
 * Supersession strategy: in-place update via `index` on the same `_id`.
 * The previous body is captured in `memory.prior_document` (stored, not indexed)
 * and `memory.revision` is incremented. This keeps the doc count stable while
 * preserving the diff chain (D11 requirement).
 *
 * The inherited `content` field carries `title + "\n\n" + description` so
 * that semantic recall covers both the concise label and the full content.
 *
 * If a tombstoned doc is found (same content_hash + author + space), it is
 * resurrected rather than duplicated — re-remembering forgotten content should
 * restore the memory, not create a second copy.
 */
export const writeMemory = async ({
  storage,
  historyClient,
  params,
}: {
  storage: MemoryStorage;
  historyClient: DataStreamClient<typeof agentMemoryHistoryMappings>;
  params: WriteMemoryParams;
}): Promise<WriteMemoryResult> => {
  const {
    title,
    description,
    category,
    type,
    tags,
    entities,
    expires_at,
    origin,
    assurance,
    call_source,
    conversation_ids,
    trace_ids,
    space_id,
    identity,
  } = params;

  const hash = contentHash(description);
  const client = storage.getClient();
  const now = new Date().toISOString();

  // ── Find-or-create on content_hash + author + space ───────────────────────
  // Search without the `deleted` filter so that re-remembering a tombstoned
  // doc resurrects it in place instead of creating a duplicate (C13).
  const existing = await client.search({
    size: 1,
    track_total_hits: false,
    seq_no_primary_term: true,
    query: {
      bool: {
        filter: [
          { term: { 'memory.content_hash': hash } },
          { term: { 'memory.provenance.author': identity.author } },
          { term: { space_id } },
        ],
      },
    },
    _source: true,
  });

  const existingHit = existing.hits.hits[0];

  if (existingHit) {
    // Supersede: in-place update, keeping the same _id.
    const prev = existingHit._source as MemoryDocument;
    const nextRevision = (prev.memory.revision ?? 0) + 1;

    // Strip prior_document from the nested snapshot to prevent O(2^N)
    // _source growth — each revision must contain only one level of history.
    const { prior_document: _dropped, ...prevMemory } = prev.memory;
    const updated: MemoryDocument = {
      ...prev,
      deleted: false,
      '@timestamp': now,
      title,
      description,
      content: `${title}\n\n${description}`,
      tags: tags ?? prev.tags,
      expires_at: expires_at ?? prev.expires_at,
      memory: {
        ...prevMemory,
        scope_kind: prev.memory.scope_kind ?? 'user',
        scope_id: prev.memory.scope_id ?? identity.author,
        type: type ?? prev.memory.type,
        category: category ?? prev.memory.category,
        entities: entities ?? prev.memory.entities,
        origin: origin ?? prev.memory.origin,
        assurance: assurance ?? prev.memory.assurance,
        revision: nextRevision,
        content_hash: hash,
        provenance: {
          ...prev.memory.provenance,
          call_source: call_source ?? prev.memory.provenance.call_source,
          conversation_ids: conversation_ids ?? prev.memory.provenance.conversation_ids,
          trace_ids: trace_ids ?? prev.memory.provenance.trace_ids,
        },
        // One level of history — use the payload with prior_document stripped.
        prior_document: {
          ...prev,
          memory: prevMemory,
        },
      },
    };

    // OCC guard: reject if a concurrent write landed between our search and
    // this index. Let the error propagate; the tool can surface it.
    await client.index({
      id: existingHit._id,
      document: updated,
      ...(existingHit._seq_no !== undefined && existingHit._primary_term !== undefined
        ? { if_seq_no: existingHit._seq_no, if_primary_term: existingHit._primary_term }
        : {}),
    });

    await writeHistoryRecord(historyClient, {
      memory_id: existingHit._id!,
      event_type: 'write',
      revision: nextRevision,
      space_id,
      identity,
      call_source,
      now,
    });

    return { id: existingHit._id!, revision: nextRevision, action: 'updated' };
  }

  // ── New memory ─────────────────────────────────────────────────────────────
  const id = uuidv4();
  const newDoc: MemoryDocument = {
    id,
    type: 'memory',
    title,
    description,
    content: `${title}\n\n${description}`,
    tags,
    deleted: false,
    expires_at,
    '@timestamp': now,
    created_at: now,
    space_id,
    memory: {
      type,
      category,
      revision: 1,
      content_hash: hash,
      scope_kind: 'user',
      scope_id: identity.author,
      entities,
      origin,
      assurance,
      provenance: {
        author: identity.author,
        author_kind: identity.author_kind,
        call_source,
        conversation_ids,
        trace_ids,
      },
    },
  };

  await client.index({ id, document: newDoc });

  await writeHistoryRecord(historyClient, {
    memory_id: id,
    event_type: 'write',
    revision: 1,
    space_id,
    identity,
    call_source,
    now,
  });

  return { id, revision: 1, action: 'created' };
};

const writeHistoryRecord = async (
  historyClient: DataStreamClient<typeof agentMemoryHistoryMappings>,
  {
    memory_id,
    event_type,
    revision,
    space_id,
    identity,
    call_source,
    now,
  }: {
    memory_id: string;
    event_type: MemoryHistoryRecord['event_type'];
    revision: number;
    space_id: string;
    identity: ResolvedIdentity;
    call_source?: string;
    now: string;
  }
): Promise<void> => {
  // Best-effort: failures here must not surface to the caller.
  try {
    await historyClient.create({
      documents: [
        {
          '@timestamp': now,
          memory_id,
          event_type,
          revision,
          space_id,
          author: identity.author,
          author_kind: identity.author_kind,
          ...(call_source ? { call_source } : {}),
        },
      ],
    });
  } catch {
    // swallow — history stream is an audit trail, not a write gate
  }
};

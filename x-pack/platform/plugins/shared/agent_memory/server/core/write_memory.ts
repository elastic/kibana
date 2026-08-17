/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import { AGENT_MEMORY_INDEX } from '../../common';
import type { CallSource, MemoryCategory, MemoryType } from '../storage/memory_storage';
import type { MemoryDocument, MemoryStorage } from '../storage/memory_storage';
import type { ResolvedIdentity } from './resolve_identity';

export interface WriteMemoryParams {
  /** Short label — displayed to the user and used in the BM25 recall leg. */
  title: string;
  /** Full content of the memory. SHA-256 of the normalised form drives dedup. */
  description: string;
  category?: MemoryCategory;
  type?: MemoryType;
  tags?: string[];
  /** ISO timestamp; optional per-record soft expiry (D5). */
  expires_at?: string;
  call_source?: CallSource;
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

const deterministicDocumentId = ({
  spaceId,
  author,
  hash,
}: {
  spaceId: string;
  author: string;
  hash: string;
}): string => createHash('sha256').update(`${spaceId}\0${author}\0${hash}`).digest('hex');

const MAX_UPDATE_ATTEMPTS = 3;

/**
 * Creates a new memory or supersedes an existing one with the same content
 * (same description, same author, same space).
 *
 * Supersession strategy: in-place update via `index` on the same `_id`, with
 * `memory.revision` incremented. This keeps the document count stable.
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
  esClient,
  params,
}: {
  storage: MemoryStorage;
  esClient: ElasticsearchClient;
  params: WriteMemoryParams;
}): Promise<WriteMemoryResult> => {
  const { title, description, category, type, tags, expires_at, call_source, space_id, identity } =
    params;

  const hash = contentHash(description);
  const client = storage.getClient();
  const now = new Date().toISOString();

  const updateExisting = async ({
    id,
    previous,
    seqNo,
    primaryTerm,
  }: {
    id: string;
    previous: MemoryDocument;
    seqNo?: number;
    primaryTerm?: number;
  }): Promise<WriteMemoryResult> => {
    let current = { previous, seqNo, primaryTerm };

    for (let attempt = 1; attempt <= MAX_UPDATE_ATTEMPTS; attempt++) {
      const nextRevision = (current.previous.memory.revision ?? 0) + 1;
      const previousIsExpired =
        current.previous.expires_at !== undefined &&
        Date.parse(current.previous.expires_at) <= Date.parse(now);
      const updated: MemoryDocument = {
        ...current.previous,
        deleted: false,
        '@timestamp': now,
        title,
        description,
        content: `${title}\n\n${description}`,
        tags: tags ?? current.previous.tags,
        expires_at:
          expires_at ??
          (current.previous.deleted || previousIsExpired ? undefined : current.previous.expires_at),
        memory: {
          scope_kind: current.previous.memory.scope_kind ?? 'user',
          scope_id: current.previous.memory.scope_id ?? identity.author,
          type: type ?? current.previous.memory.type,
          category: category ?? current.previous.memory.category,
          revision: nextRevision,
          content_hash: hash,
          provenance: {
            author: current.previous.memory.provenance.author,
            author_kind: current.previous.memory.provenance.author_kind,
            call_source: call_source ?? current.previous.memory.provenance.call_source,
          },
        },
      };

      try {
        await client.index({
          id,
          document: updated,
          ...(current.seqNo !== undefined && current.primaryTerm !== undefined
            ? { if_seq_no: current.seqNo, if_primary_term: current.primaryTerm }
            : {}),
        });
        return { id, revision: nextRevision, action: 'updated' };
      } catch (error) {
        if (
          !isResponseError(error) ||
          error.statusCode !== 409 ||
          attempt === MAX_UPDATE_ATTEMPTS
        ) {
          throw error;
        }
        const latest = await esClient.get<MemoryDocument>({ index: AGENT_MEMORY_INDEX, id });
        if (!latest._source) {
          throw new Error('Agent Memory conflict winner has no source');
        }
        current = {
          previous: latest._source,
          seqNo: latest._seq_no,
          primaryTerm: latest._primary_term,
        };
      }
    }

    throw new Error('Agent Memory update retries exhausted');
  };

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
    return updateExisting({
      id: existingHit._id!,
      previous: existingHit._source as MemoryDocument,
      seqNo: existingHit._seq_no,
      primaryTerm: existingHit._primary_term,
    });
  }

  // ── New memory ─────────────────────────────────────────────────────────────
  const id = deterministicDocumentId({ spaceId: space_id, author: identity.author, hash });
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
      provenance: {
        author: identity.author,
        author_kind: identity.author_kind,
        call_source,
      },
    },
  };

  const createResponse = await client.bulk({
    operations: [{ create: { _id: id, document: newDoc } }],
  });
  const createResult = createResponse.items[0]?.create;

  if (!createResult) {
    throw new Error('Agent Memory create failed: Elasticsearch returned no create result');
  }

  if (createResult.error) {
    if (createResult.status !== 409) {
      const errorDetails =
        typeof createResult.error === 'string'
          ? createResult.error
          : [createResult.error.type ?? 'unknown_error', createResult.error.reason]
              .filter(Boolean)
              .join(': ');
      throw new Error(`Agent Memory create failed: ${errorDetails}`);
    }

    const winner = await esClient.get<MemoryDocument>({ index: AGENT_MEMORY_INDEX, id });
    if (!winner._source) {
      throw new Error('Agent Memory create conflict winner has no source');
    }
    return updateExisting({
      id,
      previous: winner._source,
      seqNo: winner._seq_no,
      primaryTerm: winner._primary_term,
    });
  }

  return { id, revision: 1, action: 'created' };
};

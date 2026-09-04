/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { isOccConflictError, OccWriter, type OccMetadata } from '@kbn/occ';
import { AGENT_MEMORY_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';
import { AGENT_MEMORY_INDEX, type MemoryPermissions, type MemoryScopeKind } from '../../common';
import type { CallSource, MemoryCategory } from '../storage/memory_storage';
import type { MemoryDocument, MemoryStorage } from '../storage/memory_storage';
import type { ResolvedIdentity } from './resolve_identity';

export interface WriteMemoryParams {
  /** Short label — displayed to the user and used in the BM25 recall leg. */
  title: string;
  /** Full content of the memory. SHA-256 of the normalised form drives dedup. */
  description: string;
  category?: MemoryCategory;
  tags?: string[];
  /** ISO timestamp; optional per-record soft expiry (D5). */
  expires_at?: string;
  call_source?: CallSource;
  space_id: string;
  identity: ResolvedIdentity;
  /** 'user' (default) for personal memories; 'space' for team-shared within the Kibana space. */
  scope?: 'user' | 'space';
  /** Consumer namespace. Default 'agent_memory'. */
  namespace?: string;
  /** IDs of recalled memories that informed this write (attribution-grade; stored on create only). */
  used_memory_ids?: string[];
}

export interface WriteMemoryResult {
  /** The Agent Memory document ID. */
  id: string;
  revision: number;
  /** Whether this was a new memory (`created`) or an in-place supersession (`updated`). */
  action: 'created' | 'updated';
}

const normalise = (text: string): string => text.replace(/\s+/g, ' ').trim();

const contentHash = (description: string): string =>
  createHash('sha256').update(normalise(description)).digest('hex');

const buildMemoryPermissions = (space: string): MemoryPermissions => ({
  kibana: {
    privileges: [
      {
        space,
        name: [`ai_index:${AGENT_MEMORY_KI_TYPE}/read`],
        count: 1,
      },
    ],
  },
});

const deterministicDocumentId = ({
  spaceId,
  scopeKind,
  scopeId,
  hash,
}: {
  spaceId: string;
  scopeKind: MemoryScopeKind;
  scopeId: string;
  hash: string;
}): string =>
  createHash('sha256')
    .update(JSON.stringify([spaceId, scopeKind, scopeId, hash]))
    .digest('hex');

const requireOccMetadata = (
  response: { _seq_no?: number; _primary_term?: number },
  id: string
): OccMetadata => {
  if (response._seq_no === undefined || response._primary_term === undefined) {
    throw new Error(`Agent Memory index response missing OCC metadata for "${id}"`);
  }
  return { seqNo: response._seq_no, primaryTerm: response._primary_term };
};

/**
 * Creates or supersedes the deterministic document for the current user scope.
 *
 * The document key is `space_id + scope_kind + scope_id + content_hash`.
 * Creator provenance is retained independently from authoritative visibility scope.
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
  const {
    title,
    description,
    category,
    tags,
    expires_at,
    call_source,
    space_id,
    identity,
    scope,
    used_memory_ids,
  } = params;
  const namespace = params.namespace ?? 'agent_memory';
  const scopeKind: MemoryScopeKind = scope === 'space' ? 'space' : 'user';
  const scopeId = scopeKind === 'space' ? space_id : identity.author;
  const hash = contentHash(description);
  const id = deterministicDocumentId({ spaceId: space_id, scopeKind, scopeId, hash });
  const now = new Date().toISOString();
  const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const client = storage.getClient();

  const writer = new OccWriter<MemoryDocument>({
    get: async (documentId) => {
      try {
        const response = await esClient.get<MemoryDocument>({
          index: AGENT_MEMORY_INDEX,
          id: documentId,
        });
        if (!response._source) {
          throw new Error(`Agent Memory document "${documentId}" has no source`);
        }
        return {
          id: documentId,
          source: response._source,
          occ: requireOccMetadata(response, documentId),
        };
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },
    index: async ({ id: documentId, document, create, ifSeqNo, ifPrimaryTerm }) => {
      const response = await client.index({
        id: documentId,
        document,
        ...(create ? { op_type: 'create' as const } : {}),
        ...(ifSeqNo !== undefined && ifPrimaryTerm !== undefined
          ? { if_seq_no: ifSeqNo, if_primary_term: ifPrimaryTerm }
          : {}),
      });
      return requireOccMetadata(response, documentId);
    },
    maxRetries: 2,
    retryDelayMs: 0,
  });

  const newDocument: MemoryDocument = {
    id,
    type: 'memory',
    title,
    description,
    content: `${title}\n\n${description}`,
    tags,
    deleted: false,
    expires_at: expires_at ?? defaultExpiry,
    '@timestamp': now,
    created_at: now,
    space_id,
    namespace,
    permissions: buildMemoryPermissions(space_id),
    memory: {
      category,
      revision: 1,
      content_hash: hash,
      scope_kind: scopeKind,
      scope_id: scopeId,
      provenance: {
        author: identity.author,
        author_kind: identity.author_kind,
        call_source,
        ...(used_memory_ids?.length ? { used_memory_ids } : {}),
      },
    },
  };

  try {
    await writer.create({ id, document: newDocument });
    return { id, revision: 1, action: 'created' };
  } catch (error) {
    if (!isOccConflictError(error)) {
      throw error;
    }
  }

  const result = await writer.readModifyWrite({
    id,
    mutate: (previous) => {
      const previousIsExpired =
        previous.expires_at !== undefined && Date.parse(previous.expires_at) <= Date.parse(now);
      return {
        ...previous,
        deleted: false,
        '@timestamp': now,
        title,
        description,
        content: `${title}\n\n${description}`,
        tags: tags ?? previous.tags,
        namespace,
        expires_at:
          expires_at ?? (previous.deleted || previousIsExpired ? undefined : previous.expires_at),
        permissions: buildMemoryPermissions(space_id),
        memory: {
          scope_kind: scopeKind,
          scope_id: scopeId,
          type: previous.memory.type,
          category: category ?? previous.memory.category,
          revision: previous.memory.revision + 1,
          content_hash: hash,
          provenance: {
            author: previous.memory.provenance.author,
            author_kind: previous.memory.provenance.author_kind,
            call_source: call_source ?? previous.memory.provenance.call_source,
            // used_memory_ids is intentionally not propagated on supersede
          },
        },
      };
    },
  });

  return {
    id,
    revision: result.document.memory.revision,
    action: 'updated',
  };
};

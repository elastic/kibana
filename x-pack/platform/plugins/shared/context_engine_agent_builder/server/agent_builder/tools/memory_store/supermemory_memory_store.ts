/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KiNotFoundError } from '@kbn/context-engine-plugin/server/ai_indices/errors';
import {
  mergeKiDoc,
  type StoredKi,
} from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';
import { createJsonClient } from './http_client';
import {
  getExpiresAtMs,
  getLifecycleStatus,
  getStringField,
  parseStoredKi,
  toMemoryNamespace,
  toMemoryText,
} from './ki_codec';
import type {
  MemoryRevision,
  MemorySearch,
  MemoryStore,
  MemoryStoreScope,
  RecalledMemory,
} from './types';

const MAX_NAMESPACE_LENGTH = 100;
const SOURCE_METADATA_KEY = 'ki_source';

export interface SupermemoryStoreOptions {
  url: string;
  apiKey: string;
  namespacePrefix: string;
}

interface SupermemoryDocument {
  metadata?: Record<string, unknown>;
  memories?: Array<{ id: string }>;
}

interface SupermemoryRevision extends MemoryRevision {
  memoryIds: string[];
}

interface SupermemorySearchResult {
  memory?: string;
  chunk?: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

type Metadata = Record<string, string | number | string[]>;

// Flat fields support Supermemory metadata filters; `ki_source` keeps the full KI for reads.
const toMetadata = (document: StoredKi): Metadata => {
  const metadata: Metadata = { [SOURCE_METADATA_KEY]: JSON.stringify(document) };
  for (const key of ['id', 'type', 'title', 'expires_at', 'updated_at'] as const) {
    const value = document[key];
    if (typeof value === 'string') {
      metadata[key] = value;
    }
  }
  if (Array.isArray(document.tags)) {
    metadata.tags = document.tags.filter((tag): tag is string => typeof tag === 'string');
  }
  metadata.expires_at_ms = getExpiresAtMs(document);
  metadata.lifecycle_status = getLifecycleStatus(document);
  return metadata;
};

const toRecalledMemory = ({
  memory,
  chunk,
  similarity,
  metadata,
}: SupermemorySearchResult): RecalledMemory | undefined => {
  const id = getStringField(metadata, 'id');
  const text = memory ?? chunk;
  if (id === undefined || text === undefined) {
    return undefined;
  }
  const type = getStringField(metadata, 'type');
  const title = getStringField(metadata, 'title');
  return { id, ...(type && { type }), ...(title && { title }), text, similarity };
};

/** Stores and searches memories as Supermemory documents, one namespace per space and AI index. */
export const createSupermemoryMemoryStore =
  ({ url, apiKey, namespacePrefix }: SupermemoryStoreOptions) =>
  ({ aiIndexId, spaceId }: MemoryStoreScope): MemoryStore & MemorySearch => {
    const request = createJsonClient({
      serviceName: 'Supermemory',
      baseUrl: url,
      getHeaders: () => ({ Authorization: `Bearer ${apiKey}` }),
    });
    const namespace = toMemoryNamespace({
      parts: [namespacePrefix, spaceId, aiIndexId],
      separator: ':',
      maxLength: MAX_NAMESPACE_LENGTH,
    });
    const namespacePath = `/ns/${encodeURIComponent(namespace)}`;
    const documentPath = (kiId: string) => `${namespacePath}/document/${encodeURIComponent(kiId)}`;
    const notFound = (kiId: string) => () => new KiNotFoundError(aiIndexId, kiId);

    return {
      get: async (kiId): Promise<SupermemoryRevision> => {
        const document = await request<SupermemoryDocument>(
          'GET',
          `${documentPath(kiId)}?include=memories`,
          { onNotFound: notFound(kiId) }
        );
        return {
          source: parseStoredKi(document.metadata?.[SOURCE_METADATA_KEY]),
          memoryIds: (document.memories ?? []).map(({ id }) => id),
        };
      },

      put: async ({ kiId, document, existing }) => {
        const body = { content: toMemoryText(document), metadata: toMetadata(document) };
        if (existing) {
          await request('PATCH', documentPath(kiId), { body, onNotFound: notFound(kiId) });
        } else {
          await request('POST', `${namespacePath}/document`, { body: { id: kiId, ...body } });
        }
      },

      // Keeps the document as a tombstone and forgets the memories Supermemory derived from it.
      markDeleted: async ({ kiId, existing, changes }) => {
        const deleted = mergeKiDoc(existing.source, changes) as StoredKi;
        await request('PATCH', documentPath(kiId), {
          body: { metadata: toMetadata(deleted) },
          onNotFound: notFound(kiId),
        });

        const { memoryIds } = existing as SupermemoryRevision;
        if (memoryIds.length > 0) {
          await request('DELETE', `${namespacePath}/memories`, { body: { ids: memoryIds } });
        }
      },

      search: async ({ query, limit }) => {
        const { results } = await request<{ results: SupermemorySearchResult[] }>(
          'POST',
          `${namespacePath}/search`,
          {
            body: {
              query,
              limit,
              searchMode: 'hybrid',
              filter: {
                operator: 'and',
                operands: [
                  { field: 'lifecycle_status', operator: 'eq', value: 'active' },
                  { field: 'expires_at_ms', operator: 'gt', value: Date.now() },
                ],
              },
            },
          }
        );
        return results
          .map(toRecalledMemory)
          .filter((memory): memory is RecalledMemory => memory !== undefined);
      },
    };
  };

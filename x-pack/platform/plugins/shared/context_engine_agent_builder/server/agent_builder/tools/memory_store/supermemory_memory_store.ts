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
import type { MemoryRevision, MemoryStore, MemoryStoreScope } from './types';

const REQUEST_TIMEOUT_MS = 30_000;
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

type Metadata = Record<string, string | string[]>;

/** Builds a namespace matching Supermemory's `^[a-zA-Z0-9_:-]+$`, one per space and AI index. */
export const toSupermemoryNamespace = (
  namespacePrefix: string,
  spaceId: string,
  aiIndexId: string
): string =>
  [namespacePrefix, spaceId, aiIndexId]
    .join(':')
    .replace(/[^a-zA-Z0-9_:-]/g, '_')
    .slice(0, MAX_NAMESPACE_LENGTH);

const toContent = (document: StoredKi): string =>
  [document.title, document.description, document.content]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('\n\n');

// Flat fields support Supermemory metadata filters; `ki_source` keeps the full KI for reads.
const toMetadata = (document: StoredKi): Metadata => {
  const metadata: Metadata = { [SOURCE_METADATA_KEY]: JSON.stringify(document) };
  for (const key of ['type', 'title', 'expires_at', 'updated_at'] as const) {
    const value = document[key];
    if (typeof value === 'string') {
      metadata[key] = value;
    }
  }
  if (Array.isArray(document.tags)) {
    metadata.tags = document.tags.filter((tag): tag is string => typeof tag === 'string');
  }
  metadata.lifecycle_status = document.governance?.lifecycle?.status ?? 'active';
  return metadata;
};

const parseSource = (metadata: Record<string, unknown> | undefined): StoredKi => {
  const raw = metadata?.[SOURCE_METADATA_KEY];
  return typeof raw === 'string' ? (JSON.parse(raw) as StoredKi) : {};
};

/** Stores memories as Supermemory documents, one namespace per space and AI index. */
export const createSupermemoryMemoryStore =
  ({ url, apiKey, namespacePrefix }: SupermemoryStoreOptions) =>
  ({ aiIndexId, spaceId }: MemoryStoreScope): MemoryStore => {
    const namespacePath = `/ns/${encodeURIComponent(
      toSupermemoryNamespace(namespacePrefix, spaceId, aiIndexId)
    )}`;
    const documentPath = (kiId: string) => `${namespacePath}/document/${encodeURIComponent(kiId)}`;

    const request = async (
      method: string,
      path: string,
      { kiId, body }: { kiId?: string; body?: object } = {}
    ): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(new URL(path, url), {
          method,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            ...(body !== undefined && { 'Content-Type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (response.status === 404 && kiId !== undefined) {
        throw new KiNotFoundError(aiIndexId, kiId);
      }
      if (!response.ok) {
        const details = (await response.text()).slice(0, 500);
        throw new Error(`Supermemory ${method} ${path} failed with ${response.status}: ${details}`);
      }
      return response;
    };

    return {
      get: async (kiId): Promise<SupermemoryRevision> => {
        const response = await request('GET', `${documentPath(kiId)}?include=memories`, { kiId });
        const document = (await response.json()) as SupermemoryDocument;
        return {
          source: parseSource(document.metadata),
          memoryIds: (document.memories ?? []).map(({ id }) => id),
        };
      },

      put: async ({ kiId, document, existing }) => {
        const body = { content: toContent(document), metadata: toMetadata(document) };
        if (existing) {
          await request('PATCH', documentPath(kiId), { kiId, body });
        } else {
          await request('POST', `${namespacePath}/document`, { body: { id: kiId, ...body } });
        }
      },

      // Keeps the document as a tombstone and forgets the memories Supermemory derived from it.
      markDeleted: async ({ kiId, existing, changes }) => {
        const deleted = mergeKiDoc(existing.source, changes) as StoredKi;
        await request('PATCH', documentPath(kiId), {
          kiId,
          body: { metadata: toMetadata(deleted) },
        });

        const { memoryIds } = existing as SupermemoryRevision;
        if (memoryIds.length > 0) {
          await request('DELETE', `${namespacePath}/memories`, { body: { ids: memoryIds } });
        }
      },
    };
  };

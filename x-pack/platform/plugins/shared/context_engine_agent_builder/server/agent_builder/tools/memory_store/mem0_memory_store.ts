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

const MAX_APP_ID_LENGTH = 100;
const SOURCE_METADATA_KEY = 'ki_source';

export interface Mem0StoreOptions {
  url: string;
  apiKey: string;
  namespacePrefix: string;
}

interface Mem0Memory {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, unknown> | null;
}

interface Mem0Revision extends MemoryRevision {
  mem0Id: string;
}

const toMetadata = (document: StoredKi): Record<string, string> => ({
  [SOURCE_METADATA_KEY]: JSON.stringify(document),
  ki_id: String(document.id),
  ...(typeof document.type === 'string' && { type: document.type }),
  ...(typeof document.title === 'string' && { title: document.title }),
  lifecycle_status: getLifecycleStatus(document),
});

// Mem0 expires memories by calendar date and leaves expired ones out of search by default.
const toExpirationDate = (document: StoredKi): string | null =>
  typeof document.expires_at === 'string' ? document.expires_at.slice(0, 10) : null;

const toRecalledMemory = ({ memory, score, metadata }: Mem0Memory): RecalledMemory | undefined => {
  const id = getStringField(metadata, 'ki_id');
  if (id === undefined) {
    return undefined;
  }
  const type = getStringField(metadata, 'type');
  const title = getStringField(metadata, 'title');
  return {
    id,
    ...(type && { type }),
    ...(title && { title }),
    text: memory,
    similarity: score ?? 0,
  };
};

/** Stores and searches memories in Mem0, scoped by an `app_id` per space and AI index. */
export const createMem0MemoryStore =
  ({ url, apiKey, namespacePrefix }: Mem0StoreOptions) =>
  ({ aiIndexId, spaceId }: MemoryStoreScope): MemoryStore & MemorySearch => {
    const request = createJsonClient({
      serviceName: 'Mem0',
      baseUrl: url,
      getHeaders: () => ({ Authorization: `Token ${apiKey}` }),
    });
    const appId = toMemoryNamespace({
      parts: [namespacePrefix, spaceId, aiIndexId],
      separator: ':',
      maxLength: MAX_APP_ID_LENGTH,
    });
    const memoryPath = (mem0Id: string) => `/v1/memories/${encodeURIComponent(mem0Id)}/`;
    const notFound = (kiId: string) => () => new KiNotFoundError(aiIndexId, kiId);

    const update = async (kiId: string, mem0Id: string, document: StoredKi) => {
      await request('PUT', memoryPath(mem0Id), {
        body: {
          text: toMemoryText(document),
          metadata: toMetadata(document),
          expiration_date: toExpirationDate(document),
        },
        onNotFound: notFound(kiId),
      });
    };

    return {
      get: async (kiId): Promise<Mem0Revision> => {
        const { results } = await request<{ results: Mem0Memory[] }>(
          'POST',
          '/v3/memories/?page_size=1',
          {
            body: {
              filters: { AND: [{ app_id: appId }, { metadata: { ki_id: kiId } }] },
              show_expired: true,
            },
          }
        );
        const [memory] = results;
        if (!memory) {
          throw new KiNotFoundError(aiIndexId, kiId);
        }
        return {
          source: parseStoredKi(memory.metadata?.[SOURCE_METADATA_KEY]),
          mem0Id: memory.id,
        };
      },

      put: async ({ kiId, document, existing }) => {
        if (existing) {
          await update(kiId, (existing as Mem0Revision).mem0Id, document);
          return;
        }
        // `infer: false` stores the memory verbatim and returns its id synchronously.
        const expirationDate = toExpirationDate(document);
        const { results } = await request<{ results?: Array<{ id: string }> }>(
          'POST',
          '/v3/memories/add/',
          {
            body: {
              messages: [{ role: 'user', content: toMemoryText(document) }],
              app_id: appId,
              metadata: toMetadata(document),
              infer: false,
              ...(expirationDate && { expiration_date: expirationDate }),
            },
          }
        );
        if (!results?.length) {
          throw new Error(`Mem0 did not store memory '${kiId}'.`);
        }
      },

      markDeleted: async ({ kiId, existing, changes }) => {
        const deleted = mergeKiDoc(existing.source, changes) as StoredKi;
        await update(kiId, (existing as Mem0Revision).mem0Id, deleted);
      },

      search: async ({ query, limit }) => {
        const { results } = await request<{ results: Mem0Memory[] }>(
          'POST',
          '/v3/memories/search/',
          {
            body: {
              query,
              top_k: limit,
              filters: { AND: [{ app_id: appId }, { metadata: { lifecycle_status: 'active' } }] },
            },
          }
        );
        return results
          .map(toRecalledMemory)
          .filter((memory): memory is RecalledMemory => memory !== undefined);
      },
    };
  };

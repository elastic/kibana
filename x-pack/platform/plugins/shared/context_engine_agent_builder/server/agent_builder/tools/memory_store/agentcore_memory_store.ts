/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import aws from 'aws4';
import { KiNotFoundError } from '@kbn/context-engine-plugin/server/ai_indices/errors';
import {
  mergeKiDoc,
  type StoredKi,
} from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';
import { createJsonClient } from './http_client';
import {
  getExpiresAtMs,
  getLifecycleStatus,
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

const SIGNING_SERVICE = 'bedrock-agentcore';
const MAX_NAMESPACE_LENGTH = 1024;

export interface AgentCoreStoreOptions {
  region: string;
  memoryId: string;
  accessKeyId: string;
  secretAccessKey: string;
  namespacePrefix: string;
}

type MetadataValue = { stringValue: string } | { numberValue: number };

interface AgentCoreRecord {
  memoryRecordId: string;
  content?: { text?: string };
  metadata?: Record<string, MetadataValue>;
  score?: number;
}

interface AgentCoreBatchResult {
  failedRecords?: Array<{ errorMessage?: string }>;
}

interface AgentCoreRevision extends MemoryRevision {
  memoryRecordId: string;
}

// Metadata values only allow short, restricted strings, so the full KI is kept in the record text.
const toRecord = (document: StoredKi) => ({
  content: { text: JSON.stringify(document) },
  metadata: {
    ki_id: { stringValue: String(document.id) },
    lifecycle_status: { stringValue: getLifecycleStatus(document) },
    expires_at_ms: { numberValue: getExpiresAtMs(document) },
  },
  timestamp: Date.now() / 1000,
});

const metadataEquals = (key: string, value: string) => ({
  left: { metadataKey: key },
  operator: 'EQUALS_TO',
  right: { metadataValue: { stringValue: value } },
});

const parseRecord = (record: AgentCoreRecord): StoredKi => parseStoredKi(record.content?.text);

const toRecalledMemory = (record: AgentCoreRecord): RecalledMemory | undefined => {
  const document = parseRecord(record);
  if (typeof document.id !== 'string') {
    return undefined;
  }
  return {
    id: document.id,
    ...(typeof document.type === 'string' && { type: document.type }),
    ...(typeof document.title === 'string' && { title: document.title }),
    text: toMemoryText(document),
    similarity: record.score ?? 0,
  };
};

const assertBatchSucceeded = ({ failedRecords = [] }: AgentCoreBatchResult, kiId: string) => {
  if (failedRecords.length > 0) {
    throw new Error(
      `AgentCore Memory rejected memory '${kiId}': ${failedRecords[0].errorMessage ?? 'unknown'}`
    );
  }
};

/**
 * Stores and searches memories as AgentCore Memory records, one namespace per space and AI index.
 * The Memory resource must declare `ki_id` and `lifecycle_status` (STRING) and `expires_at_ms`
 * (NUMBER) as indexed keys, or AgentCore rejects the metadata filters.
 */
export const createAgentCoreMemoryStore =
  ({ region, memoryId, accessKeyId, secretAccessKey, namespacePrefix }: AgentCoreStoreOptions) =>
  ({ aiIndexId, spaceId }: MemoryStoreScope): MemoryStore & MemorySearch => {
    const host = `bedrock-agentcore.${region}.amazonaws.com`;
    const request = createJsonClient({
      serviceName: 'AgentCore Memory',
      baseUrl: `https://${host}`,
      getHeaders: ({ method, url, body }) =>
        aws.sign(
          {
            host,
            method,
            path: `${url.pathname}${url.search}`,
            region,
            service: SIGNING_SERVICE,
            headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
            body,
          },
          { accessKeyId, secretAccessKey }
        ).headers as Record<string, string>,
    });
    const namespace = toMemoryNamespace({
      parts: [namespacePrefix, spaceId, aiIndexId],
      separator: '/',
      maxLength: MAX_NAMESPACE_LENGTH,
    });
    const memoryPath = `/memories/${encodeURIComponent(memoryId)}`;

    return {
      get: async (kiId): Promise<AgentCoreRevision> => {
        const { memoryRecordSummaries } = await request<{
          memoryRecordSummaries: AgentCoreRecord[];
        }>('POST', `${memoryPath}/memoryRecords`, {
          body: { namespace, metadataFilters: [metadataEquals('ki_id', kiId)], maxResults: 1 },
        });
        const [record] = memoryRecordSummaries;
        if (!record) {
          throw new KiNotFoundError(aiIndexId, kiId);
        }
        return { source: parseRecord(record), memoryRecordId: record.memoryRecordId };
      },

      put: async ({ kiId, document, existing }) => {
        const record = { ...toRecord(document), namespaces: [namespace] };
        const result = existing
          ? await request<AgentCoreBatchResult>('POST', `${memoryPath}/memoryRecords/batchUpdate`, {
              body: {
                records: [
                  { ...record, memoryRecordId: (existing as AgentCoreRevision).memoryRecordId },
                ],
              },
            })
          : await request<AgentCoreBatchResult>('POST', `${memoryPath}/memoryRecords/batchCreate`, {
              // The AWS SDKs fill in this idempotency token; the service rejects creates without it.
              body: {
                clientToken: randomUUID(),
                records: [{ ...record, requestIdentifier: kiId }],
              },
            });
        assertBatchSucceeded(result, kiId);
      },

      markDeleted: async ({ kiId, existing, changes }) => {
        const deleted = mergeKiDoc(existing.source, changes) as StoredKi;
        const result = await request<AgentCoreBatchResult>(
          'POST',
          `${memoryPath}/memoryRecords/batchUpdate`,
          {
            body: {
              records: [
                {
                  ...toRecord(deleted),
                  namespaces: [namespace],
                  memoryRecordId: (existing as AgentCoreRevision).memoryRecordId,
                },
              ],
            },
          }
        );
        assertBatchSucceeded(result, kiId);
      },

      search: async ({ query, limit }) => {
        const { memoryRecordSummaries } = await request<{
          memoryRecordSummaries: AgentCoreRecord[];
        }>('POST', `${memoryPath}/retrieve`, {
          body: {
            namespace,
            maxResults: limit,
            searchCriteria: {
              searchQuery: query,
              topK: limit,
              metadataFilters: [
                metadataEquals('lifecycle_status', 'active'),
                {
                  left: { metadataKey: 'expires_at_ms' },
                  operator: 'GREATER_THAN',
                  right: { metadataValue: { numberValue: Date.now() } },
                },
              ],
            },
          },
        });
        return memoryRecordSummaries
          .map(toRecalledMemory)
          .filter((memory): memory is RecalledMemory => memory !== undefined);
      },
    };
  };

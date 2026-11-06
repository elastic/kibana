/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KiNotFoundError } from '@kbn/context-engine-plugin/server/ai_indices/errors';
import type { StoredKi } from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createAgentCoreMemoryStore } from './agentcore_memory_store';
import { NEVER_EXPIRES_MS } from './ki_codec';

const memory: StoredKi = {
  id: 'memory-1',
  type: 'memory.session_fact',
  title: 'Duration mapping',
  description: 'duration_ms is a keyword and must be cast.',
  content: 'Use TO_DOUBLE(duration_ms) before numeric comparisons.',
  expires_at: '2026-12-23T12:00:00.000Z',
};

const jsonResponse = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createAgentCoreMemoryStore', () => {
  const fetchMock = jest.fn();
  const store = createAgentCoreMemoryStore({
    region: 'us-east-1',
    memoryId: 'kibana_memory-abcdefghij',
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'secret',
    namespacePrefix: 'kibana',
  })({
    aiIndexId: 'support.logs',
    spaceId: 'default',
    dest: { type: 'index', value: 'ai-index-idx-support' },
    esClient: {} as ElasticsearchClient,
  });

  const memoryPath =
    'https://bedrock-agentcore.us-east-1.amazonaws.com/memories/kibana_memory-abcdefghij';
  const record = {
    memoryRecordId: 'mem-0123456789012345678901234567890123456789',
    content: { text: JSON.stringify(memory) },
    metadata: { ki_id: { stringValue: 'memory-1' } },
  };

  const call = (index: number) => {
    const [url, init] = fetchMock.mock.calls[index] as [URL, RequestInit];
    return {
      url: url.toString(),
      method: init.method,
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    };
  };

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a SigV4-signed record in the space and AI index namespace', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ successfulRecords: [record], failedRecords: [] }));

    await store.put({ kiId: 'memory-1', document: memory });

    const { url, method, headers, body } = call(0);
    expect(url).toBe(`${memoryPath}/memoryRecords/batchCreate`);
    expect(method).toBe('POST');
    expect(headers.Authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/20261001\/us-east-1\/bedrock-agentcore\/aws4_request/
    );
    expect(body).toEqual({
      clientToken: expect.any(String),
      records: [
        {
          content: { text: JSON.stringify(memory) },
          metadata: {
            ki_id: { stringValue: 'memory-1' },
            lifecycle_status: { stringValue: 'active' },
            expires_at_ms: { numberValue: Date.parse('2026-12-23T12:00:00.000Z') },
          },
          timestamp: Date.parse('2026-10-01T00:00:00.000Z') / 1000,
          namespaces: ['kibana/default/support_logs'],
          requestIdentifier: 'memory-1',
        },
      ],
    });
  });

  it('surfaces records AgentCore rejected', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ successfulRecords: [], failedRecords: [{ errorMessage: 'Content too long' }] })
    );

    await expect(store.put({ kiId: 'memory-1', document: memory })).rejects.toThrow(
      "AgentCore Memory rejected memory 'memory-1': Content too long"
    );
  });

  it('finds a record by its KI id metadata', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ memoryRecordSummaries: [record] }));

    const revision = await store.get('memory-1');

    expect(call(0)).toEqual(
      expect.objectContaining({
        url: `${memoryPath}/memoryRecords`,
        body: {
          namespace: 'kibana/default/support_logs',
          metadataFilters: [
            {
              left: { metadataKey: 'ki_id' },
              operator: 'EQUALS_TO',
              right: { metadataValue: { stringValue: 'memory-1' } },
            },
          ],
          maxResults: 1,
        },
      })
    );
    expect(revision.source).toEqual(memory);
  });

  it('throws KiNotFoundError when no record matches', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ memoryRecordSummaries: [] }));

    await expect(store.get('missing')).rejects.toBeInstanceOf(KiNotFoundError);
  });

  it('updates the existing record when revising, with a far-future expiry when non-expiring', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ memoryRecordSummaries: [record] }))
      .mockResolvedValue(jsonResponse({ successfulRecords: [record], failedRecords: [] }));
    const { expires_at: _, ...nonExpiring } = memory;

    const existing = await store.get('memory-1');
    await store.put({ kiId: 'memory-1', document: nonExpiring, existing });

    const { url, body } = call(1);
    expect(url).toBe(`${memoryPath}/memoryRecords/batchUpdate`);
    expect(body.records[0].memoryRecordId).toBe(record.memoryRecordId);
    expect(body.records[0].metadata.expires_at_ms).toEqual({ numberValue: NEVER_EXPIRES_MS });
  });

  it('tombstones a forgotten record', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ memoryRecordSummaries: [record] }))
      .mockResolvedValue(jsonResponse({ successfulRecords: [record], failedRecords: [] }));
    const writer = { uri: 'tool://forget', metadata: { run_id: 'run-1' } };

    const existing = await store.get('memory-1');
    await store.markDeleted({
      kiId: 'memory-1',
      existing,
      changes: {
        updated_at: '2026-09-25T12:00:00.000Z',
        governance: { provenance: { updated_by: writer }, lifecycle: { status: 'deleted' } },
      },
    });

    const { url, body } = call(1);
    expect(url).toBe(`${memoryPath}/memoryRecords/batchUpdate`);
    expect(body.records[0].metadata.lifecycle_status).toEqual({ stringValue: 'deleted' });
    expect(JSON.parse(body.records[0].content.text).governance.lifecycle.status).toBe('deleted');
  });

  it('retrieves active, unexpired records and maps them back to KI ids', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ memoryRecordSummaries: [{ ...record, score: 0.7 }] })
    );

    const memories = await store.search({ query: 'compare durations', limit: 5 });

    const { url, body } = call(0);
    expect(url).toBe(`${memoryPath}/retrieve`);
    expect(body).toEqual({
      namespace: 'kibana/default/support_logs',
      maxResults: 5,
      searchCriteria: {
        searchQuery: 'compare durations',
        topK: 5,
        metadataFilters: [
          {
            left: { metadataKey: 'lifecycle_status' },
            operator: 'EQUALS_TO',
            right: { metadataValue: { stringValue: 'active' } },
          },
          {
            left: { metadataKey: 'expires_at_ms' },
            operator: 'GREATER_THAN',
            right: { metadataValue: { numberValue: Date.parse('2026-10-01T00:00:00.000Z') } },
          },
        ],
      },
    });
    expect(memories).toEqual([
      {
        id: 'memory-1',
        type: 'memory.session_fact',
        title: 'Duration mapping',
        text: `${memory.title}\n\n${memory.description}\n\n${memory.content}`,
        similarity: 0.7,
      },
    ]);
  });
});

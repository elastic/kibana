/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KiNotFoundError } from '@kbn/context-engine-plugin/server/ai_indices/errors';
import type { StoredKi } from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createMem0MemoryStore } from './mem0_memory_store';

const memory: StoredKi = {
  id: 'memory-1',
  type: 'memory.session_fact',
  title: 'Duration mapping',
  description: 'duration_ms is a keyword and must be cast.',
  content: 'Use TO_DOUBLE(duration_ms) before numeric comparisons.',
  expires_at: '2026-12-23T12:00:00.000Z',
};

const memoryText = `${memory.title}\n\n${memory.description}\n\n${memory.content}`;

const jsonResponse = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createMem0MemoryStore', () => {
  const fetchMock = jest.fn();
  const store = createMem0MemoryStore({
    url: 'https://mem0.test',
    apiKey: 'm0_test',
    namespacePrefix: 'kibana',
  })({
    aiIndexId: 'support',
    spaceId: 'default',
    dest: { type: 'index', value: 'ai-index-idx-support' },
    esClient: {} as ElasticsearchClient,
  });

  const call = (index: number) => {
    const [url, init] = fetchMock.mock.calls[index] as [URL, RequestInit];
    return {
      url: url.toString(),
      method: init.method,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    };
  };

  const storedMemory = {
    id: 'mem0-uuid',
    memory: memoryText,
    metadata: { ki_source: JSON.stringify(memory), ki_id: 'memory-1' },
  };

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('adds a verbatim memory scoped to the space and AI index', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [{ id: 'mem0-uuid', event: 'ADD' }] }));

    await store.put({ kiId: 'memory-1', document: memory });

    const { url, method, headers, body } = call(0);
    expect(url).toBe('https://mem0.test/v3/memories/add/');
    expect(method).toBe('POST');
    expect(headers).toEqual(expect.objectContaining({ Authorization: 'Token m0_test' }));
    expect(body).toEqual({
      messages: [{ role: 'user', content: memoryText }],
      app_id: 'kibana:default:support',
      metadata: {
        ki_source: JSON.stringify(memory),
        ki_id: 'memory-1',
        type: 'memory.session_fact',
        title: 'Duration mapping',
        lifecycle_status: 'active',
      },
      infer: false,
      expiration_date: '2026-12-23',
    });
  });

  it('fails when Mem0 does not return the stored memory', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ event_id: 'event-1', status: 'PENDING' }));

    await expect(store.put({ kiId: 'memory-1', document: memory })).rejects.toThrow(
      "Mem0 did not store memory 'memory-1'."
    );
  });

  it('finds a memory by its KI id in metadata', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [storedMemory] }));

    const revision = await store.get('memory-1');

    expect(call(0)).toEqual(
      expect.objectContaining({
        url: 'https://mem0.test/v3/memories/?page_size=1',
        body: {
          filters: {
            AND: [{ app_id: 'kibana:default:support' }, { metadata: { ki_id: 'memory-1' } }],
          },
          show_expired: true,
        },
      })
    );
    expect(revision.source).toEqual(memory);
  });

  it('throws KiNotFoundError when no memory matches', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));

    await expect(store.get('missing')).rejects.toBeInstanceOf(KiNotFoundError);
  });

  it('updates the Mem0 memory in place when revising, clearing a removed expiry', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [storedMemory] }))
      .mockResolvedValue(jsonResponse({ id: 'mem0-uuid' }));
    const { expires_at: _, ...nonExpiring } = memory;

    const existing = await store.get('memory-1');
    await store.put({ kiId: 'memory-1', document: nonExpiring, existing });

    const { url, method, body } = call(1);
    expect(url).toBe('https://mem0.test/v1/memories/mem0-uuid/');
    expect(method).toBe('PUT');
    expect(body.expiration_date).toBeNull();
    expect(body.metadata.ki_source).toBe(JSON.stringify(nonExpiring));
  });

  it('tombstones a forgotten memory so search leaves it out', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ results: [storedMemory] }))
      .mockResolvedValue(jsonResponse({ id: 'mem0-uuid' }));
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

    const { method, body } = call(1);
    expect(method).toBe('PUT');
    expect(body.metadata.lifecycle_status).toBe('deleted');
  });

  it('searches active memories and maps them back to KI ids', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            ...storedMemory,
            score: 0.8,
            metadata: { ...storedMemory.metadata, title: 'Duration mapping' },
          },
          { id: 'other', memory: 'not from Kibana', score: 0.5, metadata: null },
        ],
      })
    );

    const memories = await store.search({ query: 'compare durations', limit: 5 });

    expect(call(0).body).toEqual({
      query: 'compare durations',
      top_k: 5,
      filters: {
        AND: [{ app_id: 'kibana:default:support' }, { metadata: { lifecycle_status: 'active' } }],
      },
    });
    expect(memories).toEqual([
      { id: 'memory-1', title: 'Duration mapping', text: memoryText, similarity: 0.8 },
    ]);
  });
});

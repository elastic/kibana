/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KiNotFoundError } from '@kbn/context-engine-plugin/server/ai_indices/errors';
import type { StoredKi } from '@kbn/context-engine-plugin/server/ai_indices/ki_revision';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createSupermemoryMemoryStore, toSupermemoryNamespace } from './supermemory_memory_store';

const memory: StoredKi = {
  '@timestamp': '2026-09-24T12:00:00.000Z',
  id: 'memory-1',
  type: 'memory.session_fact',
  title: 'Duration mapping',
  description: 'duration_ms is a keyword and must be cast.',
  content: 'Use TO_DOUBLE(duration_ms) before numeric comparisons.',
  tags: ['logs'],
  expires_at: '2026-12-23T12:00:00.000Z',
  updated_at: '2026-09-24T12:00:00.000Z',
};

const jsonResponse = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('createSupermemoryMemoryStore', () => {
  const fetchMock = jest.fn();
  const store = createSupermemoryMemoryStore({
    url: 'https://supermemory.test',
    apiKey: 'sm_test',
    namespacePrefix: 'kibana',
  })({
    aiIndexId: 'support',
    spaceId: 'default',
    dest: { type: 'index', value: 'ai-index-idx-support' },
    esClient: {} as ElasticsearchClient,
  });

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls.at(-1) as [URL, RequestInit];
    return {
      url: url.toString(),
      method: init.method,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    };
  };

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('builds a valid namespace per space and AI index', () => {
    expect(toSupermemoryNamespace('kibana', 'my space', 'support.logs')).toBe(
      'kibana:my_space:support_logs'
    );
    expect(toSupermemoryNamespace('k', 's', 'x'.repeat(200))).toHaveLength(100);
  });

  it('creates a new memory as a document keyed by the KI id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'memory-1', status: 'queued' }));

    await store.put({ kiId: 'memory-1', document: memory });

    const { url, method, headers, body } = lastCall();
    expect(url).toBe('https://supermemory.test/ns/kibana%3Adefault%3Asupport/document');
    expect(method).toBe('POST');
    expect(headers).toEqual(expect.objectContaining({ Authorization: 'Bearer sm_test' }));
    expect(body).toEqual({
      id: 'memory-1',
      content: `${memory.title}\n\n${memory.description}\n\n${memory.content}`,
      metadata: {
        ki_source: JSON.stringify(memory),
        type: 'memory.session_fact',
        title: 'Duration mapping',
        expires_at: '2026-12-23T12:00:00.000Z',
        updated_at: '2026-09-24T12:00:00.000Z',
        tags: ['logs'],
        lifecycle_status: 'active',
      },
    });
  });

  it('reads a memory back from its stored KI source', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 'memory-1',
        metadata: { ki_source: JSON.stringify(memory) },
        memories: [{ id: 'mem_1' }],
      })
    );

    const revision = await store.get('memory-1');

    expect(lastCall().url).toBe(
      'https://supermemory.test/ns/kibana%3Adefault%3Asupport/document/memory-1?include=memories'
    );
    expect(revision.source).toEqual(memory);
  });

  it('throws KiNotFoundError for a missing memory', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Not found' }, 404));

    await expect(store.get('missing')).rejects.toBeInstanceOf(KiNotFoundError);
  });

  it('replaces the document when revising an existing memory', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'memory-1', status: 'queued' }));
    const revised = { ...memory, content: 'Updated content' };

    await store.put({
      kiId: 'memory-1',
      document: revised,
      existing: { source: memory },
    });

    const { url, method, body } = lastCall();
    expect(url).toBe('https://supermemory.test/ns/kibana%3Adefault%3Asupport/document/memory-1');
    expect(method).toBe('PATCH');
    expect(body.content).toContain('Updated content');
    expect(body.metadata.ki_source).toBe(JSON.stringify(revised));
  });

  it('tombstones the document and forgets its derived memories', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          metadata: { ki_source: JSON.stringify(memory) },
          memories: [{ id: 'mem_1' }, { id: 'mem_2' }],
        })
      )
      .mockResolvedValue(jsonResponse({ count: 2, matches: [], errors: [] }));
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

    const [, [patchUrl, patchInit], [deleteUrl, deleteInit]] = fetchMock.mock.calls;
    expect(patchUrl.toString()).toBe(
      'https://supermemory.test/ns/kibana%3Adefault%3Asupport/document/memory-1'
    );
    expect(patchInit.method).toBe('PATCH');
    const { metadata } = JSON.parse(patchInit.body);
    expect(metadata.lifecycle_status).toBe('deleted');
    expect(JSON.parse(metadata.ki_source).governance.lifecycle.status).toBe('deleted');

    expect(deleteUrl.toString()).toBe(
      'https://supermemory.test/ns/kibana%3Adefault%3Asupport/memories'
    );
    expect(deleteInit.method).toBe('DELETE');
    expect(JSON.parse(deleteInit.body)).toEqual({ ids: ['mem_1', 'mem_2'] });
  });

  it('surfaces API errors with the status and response details', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Insufficient credits' }, 402));

    await expect(store.put({ kiId: 'memory-1', document: memory })).rejects.toThrow(
      /failed with 402: .*Insufficient credits/
    );
  });
});

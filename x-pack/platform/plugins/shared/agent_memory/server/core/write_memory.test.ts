/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { errors } from '@elastic/elasticsearch';
import { OccConflictError } from '@kbn/occ';
import { AGENT_MEMORY_INDEX } from '../../common';
import type { MemoryDocument } from '../storage/memory_storage';
import { writeMemory, type WriteMemoryParams } from './write_memory';

const CURRENT_TIME = '2026-08-13T12:00:00.000Z';

interface IndexRequest {
  id: string;
  document: MemoryDocument;
  op_type?: 'create';
  if_seq_no?: number;
  if_primary_term?: number;
}

interface StoredDocument {
  source: MemoryDocument;
  seqNo: number;
  primaryTerm: number;
}

const responseError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: {
      error: {
        type: statusCode === 409 ? 'version_conflict_engine_exception' : 'internal_server_error',
      },
    },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

const createHarness = () => {
  const documents = new Map<string, StoredDocument>();
  const search = jest.fn();
  let beforeConditionalIndex:
    | ((request: IndexRequest, current: StoredDocument) => void)
    | undefined;
  let conditionalError: Error | undefined;
  let createError: Error | undefined;

  const index = jest.fn(async (request: IndexRequest) => {
    const existing = documents.get(request.id);

    if (request.op_type === 'create') {
      if (createError) {
        throw createError;
      }
      if (existing) {
        throw responseError(409);
      }
      documents.set(request.id, {
        source: request.document,
        seqNo: 0,
        primaryTerm: 1,
      });
      return { _seq_no: 0, _primary_term: 1 };
    }

    if (!existing) {
      throw responseError(404);
    }

    beforeConditionalIndex?.(request, existing);
    if (conditionalError) {
      throw conditionalError;
    }

    const latest = documents.get(request.id)!;
    if (request.if_seq_no !== latest.seqNo || request.if_primary_term !== latest.primaryTerm) {
      throw responseError(409);
    }

    const next = {
      source: request.document,
      seqNo: latest.seqNo + 1,
      primaryTerm: latest.primaryTerm,
    };
    documents.set(request.id, next);
    return { _seq_no: next.seqNo, _primary_term: next.primaryTerm };
  });

  const get = jest.fn(async ({ index: requestedIndex, id }: { index: string; id: string }) => {
    expect(requestedIndex).toBe(AGENT_MEMORY_INDEX);
    const document = documents.get(id);
    if (!document) {
      throw responseError(404);
    }
    return {
      _id: id,
      _source: document.source,
      _seq_no: document.seqNo,
      _primary_term: document.primaryTerm,
    };
  });

  return {
    documents,
    search,
    index,
    get,
    storage: {
      getClient: () => ({ search, index }),
    } as never,
    esClient: { get } as never,
    setBeforeConditionalIndex: (
      callback: ((request: IndexRequest, current: StoredDocument) => void) | undefined
    ) => {
      beforeConditionalIndex = callback;
    },
    setConditionalError: (error: Error | undefined) => {
      conditionalError = error;
    },
    setCreateError: (error: Error | undefined) => {
      createError = error;
    },
  };
};

const createParams = (overrides: Partial<WriteMemoryParams> = {}): WriteMemoryParams => ({
  title: 'Preferred editor',
  description: 'The user prefers Vim.',
  space_id: 'default',
  identity: { author: 'user-1', author_kind: 'profile_uid' },
  ...overrides,
});

describe('writeMemory', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates deterministic scope-aware IDs without searching', async () => {
    const harness = createHarness();

    const created = await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams(),
    });
    expect(created).toEqual({
      id: expect.any(String),
      revision: 1,
      action: 'created',
    });

    const request = harness.index.mock.calls[0][0];
    expect(request).toMatchObject({
      id: expect.any(String),
      op_type: 'create',
      document: {
        created_at: CURRENT_TIME,
        '@timestamp': CURRENT_TIME,
        content: 'Preferred editor\n\nThe user prefers Vim.',
        space_id: 'default',
        permissions: {
          kibana: {
            privileges: [
              {
                space: 'default',
                name: ['ai_index:agent_memory/read'],
                count: 1,
              },
            ],
          },
        },
        memory: {
          scope_kind: 'user',
          scope_id: 'user-1',
          revision: 1,
          provenance: {
            author: 'user-1',
            author_kind: 'profile_uid',
          },
        },
      },
    });
    expect(request.document.id).toBe(request.id);

    const variantParams = [
      createParams({ identity: { author: 'user-2', author_kind: 'profile_uid' } }),
      createParams({ space_id: 'another-space' }),
      createParams({ description: 'The user prefers Emacs.' }),
    ];
    const results = [created];
    for (const params of variantParams) {
      results.push(
        await writeMemory({
          storage: harness.storage,
          esClient: harness.esClient,
          params,
        })
      );
    }

    expect(new Set(results.map(({ id }) => id))).toHaveProperty('size', 4);
    expect(harness.documents).toHaveProperty('size', 4);
    expect(harness.search).not.toHaveBeenCalled();

    const expectedContentHash = createHash('sha256').update('The user prefers Vim.').digest('hex');
    const expectedId = createHash('sha256')
      .update(JSON.stringify(['default', 'user', 'user-1', expectedContentHash]))
      .digest('hex');
    expect(created.id).toBe(expectedId);
  });

  it('ignores retired type input on new writes and preserves legacy type on updates', async () => {
    const harness = createHarness();
    const created = await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: {
        ...createParams({ category: 'events' }),
        type: 'procedural',
      } as WriteMemoryParams & { type: 'procedural' },
    });
    const stored = harness.documents.get(created.id)!;

    expect(stored.source.memory.type).toBeUndefined();

    harness.documents.set(created.id, {
      ...stored,
      source: {
        ...stored.source,
        memory: {
          ...stored.source.memory,
          type: 'semantic',
        },
      },
    });

    await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams({ category: 'events' }),
    });

    expect(harness.documents.get(created.id)!.source.memory.type).toBe('semantic');
  });

  it('updates the deterministic document while preserving creation and creator metadata', async () => {
    const harness = createHarness();
    const created = await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams({ call_source: 'agent', expires_at: '2026-09-01T00:00:00.000Z' }),
    });
    const stored = harness.documents.get(created.id)!;
    harness.documents.set(created.id, {
      ...stored,
      source: {
        ...stored.source,
        memory: {
          ...stored.source.memory,
          provenance: {
            author: 'original-creator',
            author_kind: 'username',
            call_source: 'agent',
          },
        },
      },
    });
    jest.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));

    const expectedScopedId = createHash('sha256')
      .update(JSON.stringify(['default', 'user', 'user-1', stored.source.memory.content_hash]))
      .digest('hex');
    const provenanceSubstitutedId = createHash('sha256')
      .update(
        JSON.stringify(['default', 'user', 'original-creator', stored.source.memory.content_hash])
      )
      .digest('hex');

    const preserved = await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams({ title: 'Preserve call source' }),
    });
    expect(preserved).toEqual({ id: expectedScopedId, revision: 2, action: 'updated' });
    expect(preserved.id).not.toBe(provenanceSubstitutedId);
    expect(harness.documents.get(created.id)!.source.memory.provenance).toEqual({
      author: 'original-creator',
      author_kind: 'username',
      call_source: 'agent',
    });

    const result = await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams({
        title: 'Updated title',
        tags: ['updated'],
        call_source: 'workflow',
      }),
    });

    const updated = harness.documents.get(created.id)!.source;
    expect(result).toEqual({ id: expectedScopedId, revision: 3, action: 'updated' });
    expect(result.id).not.toBe(provenanceSubstitutedId);
    expect(updated).toMatchObject({
      created_at: CURRENT_TIME,
      '@timestamp': '2026-08-14T12:00:00.000Z',
      title: 'Updated title',
      tags: ['updated'],
      expires_at: '2026-09-01T00:00:00.000Z',
      permissions: {
        kibana: {
          privileges: [
            {
              space: 'default',
              name: ['ai_index:agent_memory/read'],
              count: 1,
            },
          ],
        },
      },
      memory: {
        scope_kind: 'user',
        scope_id: 'user-1',
        revision: 3,
        provenance: {
          author: 'original-creator',
          author_kind: 'username',
          call_source: 'workflow',
        },
      },
    });
    expect(harness.get).toHaveBeenCalled();
    expect(harness.search).not.toHaveBeenCalled();

    await expect(
      writeMemory({
        storage: harness.storage,
        esClient: harness.esClient,
        params: createParams({ expires_at: '2026-10-01T00:00:00.000Z' }),
      })
    ).resolves.toEqual({ id: expectedScopedId, revision: 4, action: 'updated' });
    expect(harness.documents.get(created.id)!.source.expires_at).toBe('2026-10-01T00:00:00.000Z');
  });

  it('resurrects tombstoned and expired memories while clearing stale expiry', async () => {
    const staleStates = [
      { deleted: true, expires_at: '2026-08-01T00:00:00.000Z' },
      { deleted: false, expires_at: '2026-08-12T00:00:00.000Z' },
    ];

    for (const state of staleStates) {
      const harness = createHarness();
      const created = await writeMemory({
        storage: harness.storage,
        esClient: harness.esClient,
        params: createParams(),
      });
      const stored = harness.documents.get(created.id)!;
      harness.documents.set(created.id, {
        ...stored,
        source: { ...stored.source, ...state },
      });

      const result = await writeMemory({
        storage: harness.storage,
        esClient: harness.esClient,
        params: createParams({ title: 'Restored title' }),
      });

      const restored = harness.documents.get(created.id)!.source;
      expect(result).toEqual({ id: created.id, revision: 2, action: 'updated' });
      expect(restored.deleted).toBe(false);
      expect(restored.expires_at).toBeUndefined();
    }
  });

  it('converges same-scope writes and re-reads the latest conflict winner', async () => {
    const harness = createHarness();
    const write = () =>
      writeMemory({
        storage: harness.storage,
        esClient: harness.esClient,
        params: createParams(),
      });

    const results = await Promise.all([write(), write(), write()]);

    expect(harness.documents).toHaveProperty('size', 1);
    expect(new Set(results.map(({ id }) => id))).toHaveProperty('size', 1);
    expect(results.map(({ action }) => action).sort()).toEqual(['created', 'updated', 'updated']);
    expect(harness.documents.values().next().value?.source.memory.revision).toBe(3);

    const winnerHarness = createHarness();
    const created = await writeMemory({
      storage: winnerHarness.storage,
      esClient: winnerHarness.esClient,
      params: createParams(),
    });
    let injected = false;
    winnerHarness.setBeforeConditionalIndex((_request, current) => {
      if (injected) {
        return;
      }
      injected = true;
      winnerHarness.documents.set(created.id, {
        source: {
          ...current.source,
          memory: { ...current.source.memory, revision: 5 },
        },
        seqNo: current.seqNo + 1,
        primaryTerm: current.primaryTerm,
      });
    });

    const result = await writeMemory({
      storage: winnerHarness.storage,
      esClient: winnerHarness.esClient,
      params: createParams(),
    });

    expect(result.revision).toBe(6);
    expect(winnerHarness.documents.get(created.id)!.source.memory.revision).toBe(6);
    expect(winnerHarness.get).toHaveBeenCalledTimes(2);
  });

  it('throws OccConflictError after exactly three update attempts', async () => {
    const harness = createHarness();
    await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams(),
    });
    harness.index.mockClear();
    harness.get.mockClear();
    harness.setConditionalError(responseError(409));

    await expect(
      writeMemory({
        storage: harness.storage,
        esClient: harness.esClient,
        params: createParams(),
      })
    ).rejects.toBeInstanceOf(OccConflictError);

    const updateCalls = harness.index.mock.calls.filter(
      ([request]) => request.op_type !== 'create'
    );
    expect(updateCalls).toHaveLength(3);
    expect(harness.get).toHaveBeenCalledTimes(3);
  });

  it('writes space-scoped memories with correct scope fields and namespace', async () => {
    const harness = createHarness();
    const result = await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams({ scope: 'space', namespace: 'alertzero' }),
    });

    expect(result.action).toBe('created');
    const doc = harness.documents.get(result.id)!.source;
    expect(doc.memory.scope_kind).toBe('space');
    expect(doc.memory.scope_id).toBe('default'); // space_id
    expect(doc.namespace).toBe('alertzero');
    // Personal copy must NOT exist: only one doc
    expect(harness.documents.size).toBe(1);
  });

  it('defaults namespace to agent_memory when not provided', async () => {
    const harness = createHarness();
    const result = await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams(),
    });
    expect(harness.documents.get(result.id)!.source.namespace).toBe('agent_memory');
  });

  it('stores used_memory_ids in provenance on create only', async () => {
    const harness = createHarness();
    const result = await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams({ used_memory_ids: ['mem-a', 'mem-b'] }),
    });
    const doc = harness.documents.get(result.id)!.source;
    expect(doc.memory.provenance.used_memory_ids).toEqual(['mem-a', 'mem-b']);

    // used_memory_ids must NOT be copied on supersede
    await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams({ title: 'Updated' }),
    });
    const updated = harness.documents.get(result.id)!.source;
    expect(updated.memory.provenance.used_memory_ids).toBeUndefined();
  });

  it('space-scoped and user-scoped memories for identical content get distinct deterministic IDs', async () => {
    const harness = createHarness();
    const userResult = await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams(),
    });
    const spaceResult = await writeMemory({
      storage: harness.storage,
      esClient: harness.esClient,
      params: createParams({ scope: 'space' }),
    });
    expect(userResult.id).not.toBe(spaceResult.id);
    expect(harness.documents.size).toBe(2);
  });

  it('propagates non-conflict create and update errors without retries', async () => {
    const createHarnessWithError = createHarness();
    const createError = responseError(500);
    createHarnessWithError.setCreateError(createError);

    await expect(
      writeMemory({
        storage: createHarnessWithError.storage,
        esClient: createHarnessWithError.esClient,
        params: createParams(),
      })
    ).rejects.toBe(createError);

    expect(createHarnessWithError.index).toHaveBeenCalledTimes(1);
    expect(createHarnessWithError.get).not.toHaveBeenCalled();

    const updateHarnessWithError = createHarness();
    await writeMemory({
      storage: updateHarnessWithError.storage,
      esClient: updateHarnessWithError.esClient,
      params: createParams(),
    });
    updateHarnessWithError.index.mockClear();
    updateHarnessWithError.get.mockClear();
    const updateError = responseError(500);
    updateHarnessWithError.setConditionalError(updateError);

    await expect(
      writeMemory({
        storage: updateHarnessWithError.storage,
        esClient: updateHarnessWithError.esClient,
        params: createParams(),
      })
    ).rejects.toBe(updateError);

    expect(updateHarnessWithError.index).toHaveBeenCalledTimes(2);
    expect(updateHarnessWithError.get).toHaveBeenCalledTimes(1);
  });
});

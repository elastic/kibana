/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { MemoryDocument } from '../storage/memory_storage';
import { AGENT_MEMORY_INDEX } from '../../common';
import { writeMemory } from './write_memory';

const CURRENT_TIME = '2026-08-13T12:00:00.000Z';
const unusedEsClient = {} as never;

interface IndexRequest {
  id: string;
  document: MemoryDocument;
  if_seq_no?: number;
  if_primary_term?: number;
}

interface BulkCreateRequest {
  operations: [{ create: { _id: string; document: MemoryDocument } }];
}

interface BulkCreateResponse {
  errors: boolean;
  items: Array<{
    create: {
      status: number;
      error?: string | { type?: string; reason?: string };
    };
  }>;
}

const createDependencies = (
  hits: Array<{
    _id: string;
    _source: MemoryDocument;
    _seq_no?: number;
    _primary_term?: number;
  }> = []
) => {
  const search = jest.fn().mockResolvedValue({ hits: { hits } });
  const index = jest.fn(async (_request: IndexRequest) => ({}));
  const bulk = jest.fn(
    async (_request: BulkCreateRequest): Promise<BulkCreateResponse> => ({
      errors: false,
      items: [{ create: { status: 201 } }],
    })
  );

  return {
    search,
    index,
    bulk,
    storage: {
      getClient: () => ({ search, index, bulk }),
    } as never,
  };
};

describe('writeMemory', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets timestamps and semantic content when creating a memory', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const { storage, bulk } = createDependencies();

    await writeMemory({
      storage,
      esClient: unusedEsClient,
      params: {
        title: 'New memory',
        description: 'New description',
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    const writtenDocument = bulk.mock.calls[0][0].operations[0].create.document;

    expect(writtenDocument.created_at).toBe(CURRENT_TIME);
    expect(writtenDocument['@timestamp']).toBe(CURRENT_TIME);
    expect(writtenDocument.content).toBe('New memory\n\nNew description');
  });

  it('defaults new memories to the resolved user scope', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const { storage, bulk } = createDependencies();

    await writeMemory({
      storage,
      esClient: unusedEsClient,
      params: {
        title: 'New memory',
        description: 'New description',
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    expect(bulk.mock.calls[0][0].operations[0].create.document.memory).toMatchObject({
      scope_kind: 'user',
      scope_id: 'user-1',
    });
  });

  it('resurrects a legacy memory in place with a new revision timestamp and default scope', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const existingDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Original title',
      description: 'Same description',
      content: 'Original title\n\nSame description',
      deleted: true,
      '@timestamp': '2026-08-02T00:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'existing-hash',
        provenance: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    };
    const { storage, search, index } = createDependencies([
      {
        _id: 'memory-1',
        _source: existingDocument,
        _seq_no: 7,
        _primary_term: 3,
      },
    ]);

    const result = await writeMemory({
      storage,
      esClient: unusedEsClient,
      params: {
        title: 'Restored title',
        description: existingDocument.description,
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    const request = index.mock.calls[0][0];

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        seq_no_primary_term: true,
      })
    );
    expect(result).toMatchObject({ id: 'memory-1', action: 'updated' });
    expect(request).toMatchObject({
      id: 'memory-1',
      if_seq_no: 7,
      if_primary_term: 3,
    });
    expect(request.document).toMatchObject({
      deleted: false,
      created_at: existingDocument.created_at,
      '@timestamp': CURRENT_TIME,
      memory: {
        scope_kind: 'user',
        scope_id: 'user-1',
      },
    });
    expect(request.document.content).toBe('Restored title\n\nSame description');
  });

  it('preserves an explicit non-user scope when superseding', async () => {
    const existingDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Original title',
      description: 'Same description',
      content: 'Original title\n\nSame description',
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'existing-hash',
        scope_kind: 'agent',
        scope_id: 'agent-123',
        provenance: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    };
    const { storage, index } = createDependencies([
      {
        _id: 'memory-1',
        _source: existingDocument,
      },
    ]);

    await writeMemory({
      storage,
      esClient: unusedEsClient,
      params: {
        title: 'Updated title',
        description: existingDocument.description,
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    expect(index.mock.calls[0][0].document.memory).toMatchObject({
      scope_kind: 'agent',
      scope_id: 'agent-123',
    });
  });

  it('clears a stale expiry when resurrecting a deleted memory without a new expiry', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const existingDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Original title',
      description: 'Same description',
      content: 'Original title\n\nSame description',
      deleted: true,
      expires_at: '2026-08-01T00:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'existing-hash',
        provenance: { author: 'user-1', author_kind: 'profile_uid' },
      },
    };
    const { storage, index } = createDependencies([{ _id: 'memory-1', _source: existingDocument }]);

    await writeMemory({
      storage,
      esClient: unusedEsClient,
      params: {
        title: 'Restored title',
        description: existingDocument.description,
        space_id: 'default',
        identity: { author: 'user-1', author_kind: 'profile_uid' },
      },
    });

    expect(index.mock.calls[0][0].document.expires_at).toBeUndefined();
  });

  it('clears a stale expiry when resurrecting an expired memory without a new expiry', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const existingDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Original title',
      description: 'Same description',
      content: 'Original title\n\nSame description',
      deleted: false,
      expires_at: '2026-08-01T00:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'existing-hash',
        provenance: { author: 'user-1', author_kind: 'profile_uid' },
      },
    };
    const { storage, index } = createDependencies([{ _id: 'memory-1', _source: existingDocument }]);

    await writeMemory({
      storage,
      esClient: unusedEsClient,
      params: {
        title: 'Restored title',
        description: existingDocument.description,
        space_id: 'default',
        identity: { author: 'user-1', author_kind: 'profile_uid' },
      },
    });

    expect(index.mock.calls[0][0].document.expires_at).toBeUndefined();
  });

  it('preserves a non-expired expiry on an ordinary update', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const existingDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Original title',
      description: 'Same description',
      content: 'Original title\n\nSame description',
      deleted: false,
      expires_at: '2026-09-01T00:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'existing-hash',
        provenance: { author: 'user-1', author_kind: 'profile_uid' },
      },
    };
    const { storage, index } = createDependencies([{ _id: 'memory-1', _source: existingDocument }]);

    await writeMemory({
      storage,
      esClient: unusedEsClient,
      params: {
        title: 'Updated title',
        description: existingDocument.description,
        space_id: 'default',
        identity: { author: 'user-1', author_kind: 'profile_uid' },
      },
    });

    expect(index.mock.calls[0][0].document.expires_at).toBe(existingDocument.expires_at);
  });

  it('replaces an existing expiry when the caller supplies a new one', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const existingDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Original title',
      description: 'Same description',
      content: 'Original title\n\nSame description',
      expires_at: '2026-09-01T00:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'existing-hash',
        provenance: { author: 'user-1', author_kind: 'profile_uid' },
      },
    };
    const { storage, index } = createDependencies([{ _id: 'memory-1', _source: existingDocument }]);

    await writeMemory({
      storage,
      esClient: unusedEsClient,
      params: {
        title: 'Updated title',
        description: existingDocument.description,
        expires_at: '2026-10-01T00:00:00.000Z',
        space_id: 'default',
        identity: { author: 'user-1', author_kind: 'profile_uid' },
      },
    });

    expect(index.mock.calls[0][0].document.expires_at).toBe('2026-10-01T00:00:00.000Z');
  });

  it('does not embed the prior revision when superseding', async () => {
    const priorDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Original title',
      description: 'Original description',
      content: 'Original title\n\nOriginal description',
      tags: ['original'],
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'original-hash',
        provenance: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    };
    const existingDocument: MemoryDocument = {
      ...priorDocument,
      title: 'Existing title',
      description: 'Existing description',
      content: 'Existing title\n\nExisting description',
      tags: ['existing'],
      memory: {
        ...priorDocument.memory,
        revision: 2,
        content_hash: 'existing-hash',
      },
    };
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'memory-1',
            _source: existingDocument,
            _seq_no: 7,
            _primary_term: 3,
          },
        ],
      },
    });
    const index = jest.fn(
      async (_request: {
        id: string;
        document: MemoryDocument;
        if_seq_no?: number;
        if_primary_term?: number;
      }) => ({})
    );
    const storage = {
      getClient: () => ({ search, index }),
    } as never;
    await writeMemory({
      storage,
      esClient: unusedEsClient,
      params: {
        title: 'Updated title',
        description: 'Updated description',
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    const writtenDocument = index.mock.calls[0][0].document;
    expect(writtenDocument.memory).not.toHaveProperty('prior_document');
  });

  it('leaves one logical document after concurrent writes of the same memory', async () => {
    const documents = new Map<
      string,
      { source: MemoryDocument; seqNo: number; primaryTerm: number }
    >();
    const search = jest.fn(async () => ({ hits: { hits: [] } }));
    const bulk = jest.fn(
      async ({
        operations,
      }: {
        operations: Array<{ create: { _id: string; document: MemoryDocument } }>;
      }) => {
        const { _id: id, document } = operations[0].create;
        if (documents.has(id)) {
          return {
            errors: true,
            items: [{ create: { _id: id, status: 409, error: { type: 'version_conflict' } } }],
          };
        }
        documents.set(id, { source: document, seqNo: 0, primaryTerm: 1 });
        return { errors: false, items: [{ create: { _id: id, status: 201 } }] };
      }
    );
    const nativeGet = jest.fn(async ({ id }: { id: string }) => {
      const document = documents.get(id);
      if (!document) {
        throw new Error(`Missing document ${id}`);
      }
      return {
        _id: id,
        _source: document.source,
        _seq_no: document.seqNo,
        _primary_term: document.primaryTerm,
      };
    });
    const index = jest.fn(async (request: IndexRequest) => {
      const current = documents.get(request.id);
      if (
        current &&
        request.if_seq_no === current.seqNo &&
        request.if_primary_term === current.primaryTerm
      ) {
        documents.set(request.id, {
          source: request.document,
          seqNo: current.seqNo + 1,
          primaryTerm: current.primaryTerm,
        });
      } else {
        documents.set(request.id, { source: request.document, seqNo: 0, primaryTerm: 1 });
      }
      return {};
    });
    const storage = {
      getClient: () => ({ search, bulk, index }),
    } as never;
    const write = () =>
      writeMemory({
        storage,
        esClient: { get: nativeGet } as never,
        params: {
          title: 'Preferred editor',
          description: 'The user prefers Vim.',
          space_id: 'default',
          identity: { author: 'user-1', author_kind: 'profile_uid' },
        },
      });

    const results = await Promise.all([write(), write()]);

    expect(documents).toHaveProperty('size', 1);
    expect(new Set(results.map(({ id }) => id))).toHaveProperty('size', 1);
    expect(results.map(({ action }) => action).sort()).toEqual(['created', 'updated']);
  });

  it('converges three concurrent initial writes without failing a caller', async () => {
    const documents = new Map<
      string,
      { source: MemoryDocument; seqNo: number; primaryTerm: number }
    >();
    const search = jest.fn(async () => ({ hits: { hits: [] } }));
    const bulk = jest.fn(
      async ({
        operations,
      }: {
        operations: Array<{ create: { _id: string; document: MemoryDocument } }>;
      }) => {
        const { _id: id, document } = operations[0].create;
        if (documents.has(id)) {
          return {
            errors: true,
            items: [{ create: { _id: id, status: 409, error: { type: 'version_conflict' } } }],
          };
        }
        documents.set(id, { source: document, seqNo: 0, primaryTerm: 1 });
        return { errors: false, items: [{ create: { _id: id, status: 201 } }] };
      }
    );
    const nativeGet = jest.fn(async ({ id }: { id: string }) => {
      const document = documents.get(id);
      if (!document) {
        throw new Error(`Missing document ${id}`);
      }
      return {
        _id: id,
        _source: document.source,
        _seq_no: document.seqNo,
        _primary_term: document.primaryTerm,
      };
    });
    const index = jest.fn(async (request: IndexRequest) => {
      const current = documents.get(request.id);
      if (
        !current ||
        request.if_seq_no !== current.seqNo ||
        request.if_primary_term !== current.primaryTerm
      ) {
        throw new errors.ResponseError({
          statusCode: 409,
          body: { error: { type: 'version_conflict_engine_exception' } },
          headers: {},
          warnings: [],
          meta: {} as never,
        });
      }
      documents.set(request.id, {
        source: request.document,
        seqNo: current.seqNo + 1,
        primaryTerm: current.primaryTerm,
      });
      return {};
    });
    const storage = {
      getClient: () => ({ search, bulk, index }),
    } as never;
    const esClient = { get: nativeGet } as never;
    const write = () =>
      writeMemory({
        storage,
        esClient,
        params: {
          title: 'Preferred editor',
          description: 'The user prefers Vim.',
          space_id: 'default',
          identity: { author: 'user-1', author_kind: 'profile_uid' },
        },
      });

    const results = await Promise.all([write(), write(), write()]);

    expect(documents).toHaveProperty('size', 1);
    expect(new Set(results.map(({ id }) => id))).toHaveProperty('size', 1);
    expect(documents.values().next().value?.source.memory.revision).toBe(3);
  });

  it('recovers when concurrent writes conflict on an existing random-id memory', async () => {
    const id = 'legacy-random-id';
    let current: {
      source: MemoryDocument;
      seqNo: number;
      primaryTerm: number;
    } = {
      source: {
        id,
        type: 'memory',
        title: 'Original title',
        description: 'Same description',
        content: 'Original title\n\nSame description',
        deleted: false,
        created_at: CURRENT_TIME,
        space_id: 'default',
        memory: {
          revision: 1,
          content_hash: 'legacy-hash',
          provenance: { author: 'user-1', author_kind: 'profile_uid' },
        },
      } satisfies MemoryDocument,
      seqNo: 0,
      primaryTerm: 1,
    };
    const search = jest.fn(async () => ({
      hits: {
        hits: [
          {
            _id: id,
            _source: current.source,
            _seq_no: current.seqNo,
            _primary_term: current.primaryTerm,
          },
        ],
      },
    }));
    const index = jest.fn(async (request: IndexRequest) => {
      if (request.if_seq_no !== current.seqNo || request.if_primary_term !== current.primaryTerm) {
        throw new errors.ResponseError({
          statusCode: 409,
          body: { error: { type: 'version_conflict_engine_exception' } },
          headers: {},
          warnings: [],
          meta: {} as never,
        });
      }
      current = {
        source: request.document,
        seqNo: current.seqNo + 1,
        primaryTerm: current.primaryTerm,
      };
      return {};
    });
    const nativeGet = jest.fn(async () => ({
      _id: id,
      _source: current.source,
      _seq_no: current.seqNo,
      _primary_term: current.primaryTerm,
    }));
    const storage = { getClient: () => ({ search, index }) } as never;
    const esClient = { get: nativeGet } as never;
    const write = () =>
      writeMemory({
        storage,
        esClient,
        params: {
          title: 'Updated title',
          description: 'Same description',
          space_id: 'default',
          identity: { author: 'user-1', author_kind: 'profile_uid' },
        },
      });

    const results = await Promise.all([write(), write()]);

    expect(results).toHaveLength(2);
    expect(results.every(({ action }) => action === 'updated')).toBe(true);
    expect(current.source.memory.revision).toBe(3);
  });

  it('uses native Elasticsearch get after a deterministic create conflict', async () => {
    const winner: MemoryDocument = {
      id: 'deterministic-id',
      type: 'memory',
      title: 'Preferred editor',
      description: 'The user prefers Vim.',
      content: 'Preferred editor\n\nThe user prefers Vim.',
      deleted: false,
      created_at: CURRENT_TIME,
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'hash',
        provenance: { author: 'user-1', author_kind: 'profile_uid' },
      },
    };
    const adapterGet = jest.fn().mockRejectedValue(new Error('search-backed get was used'));
    const index = jest.fn().mockResolvedValue({});
    const storage = {
      getClient: () => ({
        search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
        bulk: jest.fn().mockResolvedValue({
          errors: true,
          items: [
            {
              create: {
                status: 409,
                error: { type: 'version_conflict_engine_exception' },
              },
            },
          ],
        }),
        get: adapterGet,
        index,
      }),
    } as never;
    const nativeGet = jest.fn().mockResolvedValue({
      _id: 'deterministic-id',
      _source: winner,
      _seq_no: 0,
      _primary_term: 1,
    });

    await expect(
      writeMemory({
        storage,
        esClient: { get: nativeGet } as never,
        params: {
          title: winner.title,
          description: winner.description,
          space_id: winner.space_id,
          identity: { author: 'user-1', author_kind: 'profile_uid' },
        },
      })
    ).resolves.toMatchObject({ action: 'updated' });

    expect(adapterGet).not.toHaveBeenCalled();
    expect(nativeGet).toHaveBeenCalledWith({
      index: AGENT_MEMORY_INDEX,
      id: expect.any(String),
    });
  });

  it('propagates the final 409 after three update attempts', async () => {
    const existingDocument: MemoryDocument = {
      id: 'legacy-random-id',
      type: 'memory',
      title: 'Original title',
      description: 'Same description',
      content: 'Original title\n\nSame description',
      created_at: CURRENT_TIME,
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'legacy-hash',
        provenance: { author: 'user-1', author_kind: 'profile_uid' },
      },
    };
    const conflicts = Array.from(
      { length: 3 },
      () =>
        new errors.ResponseError({
          statusCode: 409,
          body: { error: { type: 'version_conflict_engine_exception' } },
          headers: {},
          warnings: [],
          meta: {} as never,
        })
    );
    const index = jest
      .fn()
      .mockRejectedValueOnce(conflicts[0])
      .mockRejectedValueOnce(conflicts[1])
      .mockRejectedValueOnce(conflicts[2]);
    const storage = {
      getClient: () => ({
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: existingDocument.id,
                _source: existingDocument,
                _seq_no: 0,
                _primary_term: 1,
              },
            ],
          },
        }),
        index,
      }),
    } as never;
    const nativeGet = jest.fn().mockResolvedValue({
      _id: existingDocument.id,
      _source: existingDocument,
      _seq_no: 0,
      _primary_term: 1,
    });

    await expect(
      writeMemory({
        storage,
        esClient: { get: nativeGet } as never,
        params: {
          title: 'Updated title',
          description: existingDocument.description,
          space_id: existingDocument.space_id,
          identity: { author: 'user-1', author_kind: 'profile_uid' },
        },
      })
    ).rejects.toBe(conflicts[2]);

    expect(index).toHaveBeenCalledTimes(3);
    expect(nativeGet).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-409 update failure', async () => {
    const existingDocument: MemoryDocument = {
      id: 'legacy-random-id',
      type: 'memory',
      title: 'Original title',
      description: 'Same description',
      content: 'Original title\n\nSame description',
      created_at: CURRENT_TIME,
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'legacy-hash',
        provenance: { author: 'user-1', author_kind: 'profile_uid' },
      },
    };
    const serverError = new errors.ResponseError({
      statusCode: 500,
      body: { error: { type: 'internal_server_error' } },
      headers: {},
      warnings: [],
      meta: {} as never,
    });
    const index = jest.fn().mockRejectedValue(serverError);
    const storage = {
      getClient: () => ({
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: existingDocument.id,
                _source: existingDocument,
                _seq_no: 0,
                _primary_term: 1,
              },
            ],
          },
        }),
        index,
      }),
    } as never;
    const nativeGet = jest.fn();

    await expect(
      writeMemory({
        storage,
        esClient: { get: nativeGet } as never,
        params: {
          title: 'Updated title',
          description: existingDocument.description,
          space_id: existingDocument.space_id,
          identity: { author: 'user-1', author_kind: 'profile_uid' },
        },
      })
    ).rejects.toBe(serverError);

    expect(index).toHaveBeenCalledTimes(1);
    expect(nativeGet).not.toHaveBeenCalled();
  });

  it('propagates non-conflict bulk create errors with Elasticsearch details', async () => {
    const { storage, bulk } = createDependencies();
    bulk.mockResolvedValue({
      errors: true,
      items: [
        {
          create: {
            status: 500,
            error: {
              type: 'strict_dynamic_mapping_exception',
              reason: 'mapping rejected the document',
            },
          },
        },
      ],
    });

    await expect(
      writeMemory({
        storage,
        esClient: unusedEsClient,
        params: {
          title: 'Preferred editor',
          description: 'The user prefers Vim.',
          space_id: 'default',
          identity: { author: 'user-1', author_kind: 'profile_uid' },
        },
      })
    ).rejects.toThrow(
      'Agent Memory create failed: strict_dynamic_mapping_exception: mapping rejected the document'
    );
  });
});

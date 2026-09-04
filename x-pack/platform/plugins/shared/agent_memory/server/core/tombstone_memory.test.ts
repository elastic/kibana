/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { MemoryDocument } from '../storage/memory_storage';
import { tombstoneMemory } from './tombstone_memory';

const CURRENT_TIME = '2026-08-13T12:00:00.000Z';

const permissionsForSpace = (space: string): MemoryDocument['permissions'] => ({
  kibana: {
    privileges: [
      {
        space,
        name: ['ai_index:agent_memory/read'],
        count: 1,
      },
    ],
  },
});

const responseError = (statusCode: number) =>
  new errors.ResponseError({
    statusCode,
    body: {
      error: {
        type: statusCode === 404 ? 'resource_not_found_exception' : 'internal_server_error',
      },
    },
    headers: {},
    warnings: [],
    meta: {} as never,
  });

describe('tombstoneMemory', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('preserves creation time and advances revision time when tombstoning with OCC', async () => {
    jest.useFakeTimers().setSystemTime(new Date(CURRENT_TIME));
    const existingDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Memory title',
      description: 'Memory description',
      content: 'Memory title\n\nMemory description',
      deleted: false,
      '@timestamp': '2026-08-02T00:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      namespace: 'agent_memory',
      permissions: permissionsForSpace('default'),
      memory: {
        revision: 2,
        content_hash: 'memory-hash',
        scope_kind: 'user',
        scope_id: 'user-1',
        provenance: {
          author: 'original-creator',
          author_kind: 'profile_uid',
        },
      },
    };
    const get = jest.fn().mockResolvedValue({
      found: true,
      _source: existingDocument,
      _seq_no: 7,
      _primary_term: 3,
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
      getClient: () => ({ get, index }),
    } as never;
    const result = await tombstoneMemory({
      storage,
      params: {
        id: 'memory-1',
        space_id: 'default',
        identity: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    });

    expect(result).toEqual({ result: 'deleted' });
    expect(get).toHaveBeenCalledWith({
      id: 'memory-1',
      _source: true,
      seq_no_primary_term: true,
    });
    expect(index).toHaveBeenCalledWith({
      id: 'memory-1',
      document: {
        ...existingDocument,
        '@timestamp': CURRENT_TIME,
        deleted: true,
      },
      if_seq_no: 7,
      if_primary_term: 3,
    });
  });

  it('does not mutate foreign, non-creator space, or malformed scopes', async () => {
    const scopeVariants = [
      {
        space_id: 'default',
        scope_kind: 'user' as const,
        scope_id: 'user-2',
        provenanceAuthor: 'user-1',
      },
      // Space-scoped memory where the caller is NOT the original creator
      {
        space_id: 'default',
        scope_kind: 'space' as const,
        scope_id: 'default',
        provenanceAuthor: 'other-user',
      },
      {
        space_id: 'another-space',
        scope_kind: 'user' as const,
        scope_id: 'user-1',
        provenanceAuthor: 'user-1',
      },
    ];

    for (const scope of scopeVariants) {
      const existingDocument: MemoryDocument = {
        id: 'memory-1',
        type: 'memory',
        title: 'Memory title',
        description: 'Memory description',
        content: 'Memory title\n\nMemory description',
        deleted: false,
        created_at: '2026-08-01T00:00:00.000Z',
        space_id: scope.space_id,
        namespace: 'agent_memory',
        permissions: permissionsForSpace(scope.space_id),
        memory: {
          revision: 1,
          content_hash: 'memory-hash',
          scope_kind: scope.scope_kind,
          scope_id: scope.scope_id,
          provenance: {
            author: scope.provenanceAuthor,
            author_kind: 'profile_uid',
          },
        },
      };
      const index = jest.fn();
      const storage = {
        getClient: () => ({
          get: jest.fn().mockResolvedValue({
            found: true,
            _source: existingDocument,
            _seq_no: 7,
            _primary_term: 3,
          }),
          index,
        }),
      } as never;

      await expect(
        tombstoneMemory({
          storage,
          params: {
            id: existingDocument.id,
            space_id: 'default',
            identity: { author: 'user-1', author_kind: 'profile_uid' },
          },
        })
      ).resolves.toEqual({ result: 'not_found' });
      expect(index).not.toHaveBeenCalled();
    }

    const malformed = {
      id: 'memory-1',
      type: 'memory',
      title: 'Memory title',
      description: 'Memory description',
      content: 'Memory title\n\nMemory description',
      deleted: false,
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 1,
        content_hash: 'memory-hash',
        provenance: { author: 'user-1', author_kind: 'profile_uid' },
      },
    } as unknown as MemoryDocument;
    const malformedIndex = jest.fn();
    const malformedStorage = {
      getClient: () => ({
        get: jest.fn().mockResolvedValue({
          found: true,
          _source: malformed,
          _seq_no: 7,
          _primary_term: 3,
        }),
        index: malformedIndex,
      }),
    } as never;

    await expect(
      tombstoneMemory({
        storage: malformedStorage,
        params: {
          id: malformed.id,
          space_id: 'default',
          identity: { author: 'user-1', author_kind: 'profile_uid' },
        },
      })
    ).resolves.toEqual({ result: 'not_found' });
    expect(malformedIndex).not.toHaveBeenCalled();
  });

  it('does not mutate when execution is aborted after loading the document', async () => {
    const abortController = new AbortController();
    const abortReason = new Error('Workflow execution cancelled');
    const existingDocument: MemoryDocument = {
      id: 'memory-1',
      type: 'memory',
      title: 'Memory title',
      description: 'Memory description',
      content: 'Memory title\n\nMemory description',
      deleted: false,
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      namespace: 'agent_memory',
      permissions: permissionsForSpace('default'),
      memory: {
        revision: 1,
        content_hash: 'memory-hash',
        scope_kind: 'user',
        scope_id: 'user-1',
        provenance: {
          author: 'user-1',
          author_kind: 'profile_uid',
        },
      },
    };
    const get = jest.fn().mockImplementation(async () => {
      abortController.abort(abortReason);
      return {
        found: true,
        _source: existingDocument,
        _seq_no: 7,
        _primary_term: 3,
      };
    });
    const index = jest.fn();
    const storage = {
      getClient: () => ({ get, index }),
    } as never;

    await expect(
      tombstoneMemory({
        storage,
        abortSignal: abortController.signal,
        params: {
          id: existingDocument.id,
          space_id: 'default',
          identity: { author: 'user-1', author_kind: 'profile_uid' },
        },
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(index).not.toHaveBeenCalled();
  });

  it('returns not_found only for genuine 404 errors and propagates other failures', async () => {
    const params = {
      id: 'memory-1',
      space_id: 'default',
      identity: { author: 'user-1', author_kind: 'profile_uid' as const },
    };
    const error = responseError(500);
    const errorStorage = {
      getClient: () => ({ get: jest.fn().mockRejectedValue(error) }),
    } as never;

    await expect(
      tombstoneMemory({
        storage: errorStorage,
        params,
      })
    ).rejects.toBe(error);

    const notFoundError = responseError(404);
    const notFoundStorage = {
      getClient: () => ({ get: jest.fn().mockRejectedValue(notFoundError) }),
    } as never;

    await expect(
      tombstoneMemory({
        storage: notFoundStorage,
        params,
      })
    ).resolves.toEqual({ result: 'not_found' });
  });
});

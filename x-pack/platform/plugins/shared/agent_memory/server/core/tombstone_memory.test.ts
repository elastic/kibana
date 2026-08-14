/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryDocument } from '../storage/memory_storage';
import { tombstoneMemory } from './tombstone_memory';

const CURRENT_TIME = '2026-08-13T12:00:00.000Z';

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
      deleted: false,
      '@timestamp': '2026-08-02T00:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
      space_id: 'default',
      memory: {
        revision: 2,
        content_hash: 'memory-hash',
        provenance: {
          author: 'user-1',
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
    const historyClient = {
      create: jest.fn().mockResolvedValue(undefined),
    } as never;

    const result = await tombstoneMemory({
      storage,
      historyClient,
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
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MemoryDocument } from '../storage/memory_storage';
import { recallMemory } from './recall_memory';

const lexicalMemory: MemoryDocument = {
  id: 'memory-1',
  type: 'memory',
  title: 'Preferred editor',
  description: 'The user prefers Vim.',
  content: 'Preferred editor\n\nThe user prefers Vim.',
  deleted: false,
  created_at: '2026-08-01T00:00:00.000Z',
  space_id: 'default',
  memory: {
    revision: 1,
    content_hash: 'hash',
    scope_kind: 'user',
    scope_id: 'user-1',
    provenance: {
      author: 'original-creator',
      author_kind: 'profile_uid',
    },
  },
};

const recallParams = {
  query: 'editor preference',
  category: 'preferences' as const,
  space_id: 'default',
  identity: {
    author: 'user-1',
    author_kind: 'profile_uid' as const,
  },
};

describe('recallMemory', () => {
  it('retries a failed hybrid recall with keyword-only retrieval and returns lexical hits', async () => {
    const search = jest
      .fn()
      .mockRejectedValueOnce(new Error('semantic inference unavailable'))
      .mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'memory-1', _source: lexicalMemory }],
        },
      });
    const logger = { warn: jest.fn() };
    const storage = { getClient: () => ({ search }) } as never;

    await expect(
      recallMemory({ storage, params: recallParams, logger: logger as never })
    ).resolves.toEqual({
      memories: [
        {
          id: 'memory-1',
          title: 'Preferred editor',
          description: 'The user prefers Vim.',
          category: undefined,
          type: undefined,
          tags: undefined,
          created_at: '2026-08-01T00:00:00.000Z',
          author: 'original-creator',
          author_kind: 'profile_uid',
          revision: 1,
        },
      ],
    });
    expect(search).toHaveBeenCalledTimes(2);
    expect(search.mock.calls[0][0].retriever).toHaveProperty('rrf');
    expect(search.mock.calls[0][0].min_score).toBe(0.05);
    expect(search.mock.calls[1][0].retriever).toEqual(
      expect.objectContaining({
        standard: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: expect.arrayContaining([
                expect.objectContaining({ multi_match: expect.any(Object) }),
              ]),
            }),
          }),
        }),
      })
    );
    expect(search.mock.calls[1][0].min_score).toBe(1);
    expect(search.mock.calls[1][0].retriever).not.toHaveProperty('rrf');
    expect(JSON.stringify(search.mock.calls[1][0].retriever)).not.toContain('content.semantic');
    expect(JSON.stringify(search.mock.calls[1][0].retriever)).toContain('memory.scope_id');
    expect(JSON.stringify(search.mock.calls[1][0].retriever)).not.toContain(
      'memory.provenance.author'
    );
  });

  it('fails open after both recall attempts fail without logging memory content', async () => {
    const search = jest
      .fn()
      .mockRejectedValueOnce(new Error('hybrid failed for private memory content'))
      .mockRejectedValueOnce(new Error('keyword failed for private memory content'));
    const logger = { warn: jest.fn() };
    const storage = { getClient: () => ({ search }) } as never;

    await expect(
      recallMemory({
        storage,
        params: { ...recallParams, query: 'private memory content' },
        logger: logger as never,
      })
    ).resolves.toEqual({ memories: [] });

    expect(search).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('private memory content');
  });
});

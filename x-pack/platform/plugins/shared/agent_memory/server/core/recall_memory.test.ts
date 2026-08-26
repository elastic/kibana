/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, type DiagnosticResult } from '@elastic/elasticsearch';
import { recallMemory } from './recall_memory';

const createResponseError = (): errors.ResponseError =>
  new errors.ResponseError({
    statusCode: 503,
    body: {
      error: {
        type: 'inference_service_unavailable',
        reason: 'semantic inference failed for private memory content',
      },
    },
    headers: {},
    warnings: [],
    meta: {
      aborted: false,
      attempts: 1,
      connection: null,
      context: null,
      name: 'agent-memory-test',
      request: {} as DiagnosticResult['meta']['request'],
    },
  });

const lexicalResponse = {
  columns: [
    { name: '_id', type: 'keyword' },
    { name: 'title', type: 'text' },
    { name: 'description', type: 'text' },
    { name: 'category', type: 'keyword' },
    { name: 'memory_type', type: 'keyword' },
    { name: 'tags', type: 'keyword' },
    { name: 'created_at', type: 'date' },
    { name: 'author', type: 'keyword' },
    { name: 'author_kind', type: 'keyword' },
    { name: 'revision', type: 'long' },
  ],
  values: [
    [
      'memory-1',
      'Preferred editor',
      'The user prefers Vim.',
      'preferences',
      'semantic',
      ['editor'],
      '2026-08-01T00:00:00.000Z',
      'original-creator',
      'profile_uid',
      1,
    ],
  ],
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
    const esql = jest
      .fn()
      .mockRejectedValueOnce(new Error('semantic inference unavailable'))
      .mockResolvedValueOnce(lexicalResponse);
    const logger = { warn: jest.fn() };
    const storage = { getClient: () => ({ esql }) } as never;
    const taggedRecallParams = {
      ...recallParams,
      tags: ['project:phoenix', 'source:workflow'],
    };

    await expect(
      recallMemory({ storage, params: taggedRecallParams, logger: logger as never })
    ).resolves.toEqual({
      memories: [
        {
          id: 'memory-1',
          title: 'Preferred editor',
          description: 'The user prefers Vim.',
          category: 'preferences',
          type: 'semantic',
          tags: ['editor'],
          created_at: '2026-08-01T00:00:00.000Z',
          author: 'original-creator',
          author_kind: 'profile_uid',
          revision: 1,
        },
      ],
    });
    expect(esql).toHaveBeenCalledTimes(2);
    expect(esql.mock.calls[0][0].pipeline.toRequest().query).toContain('FUSE RRF');
    expect(esql.mock.calls[1][0].pipeline.toRequest().query).not.toContain('FUSE');
    expect(esql.mock.calls[0][0].metadata).toEqual(['_id', '_index', '_score']);
    expect(JSON.stringify(esql.mock.calls[0][0].filter)).toContain('memory.scope_id');
    expect(esql.mock.calls[0][0].filter.bool.filter).toEqual(
      expect.arrayContaining([
        { term: { tags: 'project:phoenix' } },
        { term: { tags: 'source:workflow' } },
      ])
    );
    expect(JSON.stringify(esql.mock.calls[0][0].filter)).not.toContain('memory.provenance.author');
  });

  it('fails open after both recall attempts fail without logging memory content', async () => {
    const esql = jest
      .fn()
      .mockRejectedValueOnce(createResponseError())
      .mockRejectedValueOnce(new Error('keyword failed for private memory content'));
    const logger = { warn: jest.fn() };
    const storage = { getClient: () => ({ esql }) } as never;

    await expect(
      recallMemory({
        storage,
        params: { ...recallParams, query: 'private memory content' },
        logger: logger as never,
      })
    ).resolves.toEqual({ memories: [] });

    expect(esql).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenNthCalledWith(
      1,
      'Agent Memory hybrid recall failed; retrying with keyword-only retrieval ' +
        '(kind=ResponseError status_code=503 type=inference_service_unavailable)'
    );
    expect(logger.warn).toHaveBeenNthCalledWith(
      2,
      'Agent Memory keyword recall fallback failed; returning empty results (kind=Error)'
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('private memory content');
  });
});

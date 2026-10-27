/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { LongTermMemoryType } from '../../../common/memory';
import type { StoredMemoryDocument } from '../memory_document';
import { CANDIDATES_PER_MEMORY, fetchCandidates, fuseRankedResults } from './candidates';

const longTerm = (id: string, updatedAt = '2026-10-01T00:00:00.000Z') =>
  ({ id, updated_at: updatedAt } as StoredMemoryDocument);

const shortTerm = (id: string, title: string, description?: string) =>
  ({ id, title, description } as StoredMemoryDocument);

const hits = (...documents: StoredMemoryDocument[]) => ({
  hits: { hits: documents.map((document) => ({ _source: document })) },
});

describe('fuseRankedResults', () => {
  it('ranks results found by several searches first', () => {
    const fused = fuseRankedResults(
      [
        [longTerm('a'), longTerm('b')],
        [longTerm('c'), longTerm('b')],
      ],
      10
    );

    expect(fused.map(({ id }) => id)).toEqual(['b', 'a', 'c']);
  });

  it('breaks ties by the most recent update and applies the limit', () => {
    const fused = fuseRankedResults(
      [
        [longTerm('old', '2026-01-01T00:00:00.000Z')],
        [longTerm('new', '2026-09-01T00:00:00.000Z')],
      ],
      1
    );

    expect(fused.map(({ id }) => id)).toEqual(['new']);
  });
});

describe('fetchCandidates', () => {
  let msearch: jest.Mock;
  let search: jest.Mock;

  const fetch = (memories: StoredMemoryDocument[], types: LongTermMemoryType[] = ['memory.fact']) =>
    fetchCandidates({
      esClient: { msearch, search } as unknown as ElasticsearchClient,
      spaceId: 'team-a',
      types,
      memories,
      now: '2026-10-02T00:00:00.000Z',
      logger: loggerMock.create(),
    });

  beforeEach(() => {
    msearch = jest.fn();
    search = jest.fn().mockResolvedValue(hits(longTerm('recent')));
  });

  it('runs one hybrid search per distinct short-term memory and merges the results', async () => {
    msearch.mockResolvedValue({ responses: [hits(longTerm('a')), hits(longTerm('b'))] });

    const candidates = await fetch([
      shortTerm('s1', 'Orders', 'uses @timestamp'),
      shortTerm('s2', 'Users', 'keyed by id'),
      shortTerm('s3', 'Orders', 'uses @timestamp'),
    ]);

    expect(candidates.map(({ id }) => id)).toEqual(['a', 'b']);
    const { searches } = msearch.mock.calls[0][0];
    expect(searches).toHaveLength(4);
    expect(searches[1]).toMatchObject({
      size: CANDIDATES_PER_MEMORY,
      query: {
        bool: {
          should: [
            { multi_match: { query: 'Orders. uses @timestamp' } },
            { semantic: { field: 'content.semantic', query: 'Orders. uses @timestamp' } },
          ],
          minimum_should_match: 1,
        },
      },
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('searches every requested type', async () => {
    msearch.mockResolvedValue({ responses: [hits(longTerm('a'))] });

    await fetch([shortTerm('s1', 'Orders')], ['memory.entity', 'memory.fact']);

    expect(msearch.mock.calls[0][0].searches[1].query.bool.filter).toContainEqual({
      terms: { type: ['memory.entity', 'memory.fact'] },
    });
  });

  it('falls back to lexical searches when a semantic search fails', async () => {
    msearch
      .mockResolvedValueOnce({ responses: [{ error: { type: 'x', reason: 'no semantic field' } }] })
      .mockResolvedValueOnce({ responses: [hits(longTerm('a'))] });

    const candidates = await fetch([shortTerm('s1', 'Orders')]);

    expect(candidates.map(({ id }) => id)).toEqual(['a']);
    expect(msearch.mock.calls[1][0].searches[1].query.bool.should).toEqual([
      expect.objectContaining({ multi_match: expect.anything() }),
    ]);
  });

  it('falls back to the most recently updated memories when nothing matches', async () => {
    msearch.mockResolvedValue({ responses: [hits()] });

    const candidates = await fetch([shortTerm('s1', 'Orders')]);

    expect(candidates.map(({ id }) => id)).toEqual(['recent']);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ sort: [{ updated_at: 'desc' }] }),
      expect.anything()
    );
  });
});

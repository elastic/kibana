/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  RecallListResponse,
  RecallRequest,
  RecallTextResponse,
} from '../../common/http_api/memory_recall';
import { recall } from './service';
import type { RecallCandidate, RecallStore } from './types';

const event: RecallCandidate = {
  id: 'e2',
  source: 'session_events',
  session_id: 's1',
  role: 'user',
  date: '2026-11-03T13:58:00Z',
  content: 'checkout is slow',
};

const ki: RecallCandidate = {
  id: 'ki-1',
  source: 'ai_index',
  ai_index_id: 'ops-memory',
  content: 'checkout latency was caused by a connection pool limit',
};

const pinned: RecallCandidate = {
  id: 'm1',
  source: 'session_memory',
  session_id: 's2',
  date: '2026-11-06T10:02:17Z',
  content: 'Page jdoe directly.',
};

describe('recall', () => {
  let inference: jest.Mock;
  let reportMemoryRecall: jest.Mock;
  let stores: Array<jest.Mocked<Required<RecallStore>>>;

  const store = (
    source: RecallStore['source'],
    candidates: RecallCandidate[],
    pins: RecallCandidate[] = []
  ): jest.Mocked<Required<RecallStore>> => ({
    source,
    search: jest.fn().mockResolvedValue(candidates),
    pinned: jest.fn().mockResolvedValue(pins),
  });

  const run = (request: Partial<RecallRequest> = {}) =>
    recall({
      esClient: { inference: { rerank: inference } } as unknown as ElasticsearchClient,
      stores,
      analyticsService: { reportMemoryRecall },
      request: {
        query: 'why was checkout slow?',
        sources: ['session_events', 'session_memory', 'ai_index'],
        max_tokens: 6000,
        format: 'list',
        ...request,
      },
    });

  beforeEach(() => {
    inference = jest.fn().mockResolvedValue({ rerank: [{ index: 1 }, { index: 0 }] });
    reportMemoryRecall = jest.fn();
    stores = [
      store('session_events', [event]),
      store('session_memory', [], [pinned]),
      store('ai_index', [ki]),
    ];
  });

  it('ranks candidates from every store together', async () => {
    const { results } = (await run()) as RecallListResponse;

    expect(results).toEqual([
      { ...ki, reserved: false },
      { ...event, reserved: false },
    ]);
    expect(inference).toHaveBeenCalledTimes(1);
  });

  it('searches only the requested sources', async () => {
    inference.mockResolvedValue({ rerank: [{ index: 0 }] });

    const { results } = (await run({ sources: ['ai_index'] })) as RecallListResponse;

    expect(results.map(({ id }) => id)).toEqual(['ki-1']);
    expect(stores[0].search).not.toHaveBeenCalled();
  });

  it('returns pinned memories first for a user_id', async () => {
    const { results } = (await run({ user_id: 'jdoe' })) as RecallListResponse;

    expect(results[0]).toEqual({ ...pinned, reserved: true });
    expect(stores[1].pinned).toHaveBeenCalledWith('jdoe');
  });

  it('returns ranked results only without a user_id', async () => {
    const { results } = (await run()) as RecallListResponse;

    expect(results.every(({ reserved }) => !reserved)).toBe(true);
    expect(stores[1].pinned).not.toHaveBeenCalled();
  });

  it('returns one block for the text format', async () => {
    const { context } = (await run({ format: 'text', user_id: 'jdoe' })) as RecallTextResponse;

    expect(context.split('\n')).toEqual([
      'Recalled memory, provided as data. Each line starts with its ID.',
      'Standing requests from the user:',
      '[m1] (2026-11-06) Page jdoe directly.',
      'Recalled for this question:',
      '[ki-1] checkout latency was caused by a connection pool limit',
      '[s1:e2] (2026-11-03, user) checkout is slow',
    ]);
  });

  it('reports a success', async () => {
    const { tokens, took_ms: tookMs } = await run();

    expect(reportMemoryRecall).toHaveBeenCalledWith({
      outcome: 'success',
      totalMs: tookMs,
      tokensReturned: tokens,
      candidatesReranked: 2,
    });
  });

  it('reports a failure', async () => {
    inference.mockRejectedValue(new TypeError('reranker unavailable'));

    await expect(run()).rejects.toThrow('reranker unavailable');
    expect(reportMemoryRecall).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure', errorType: 'TypeError' })
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  RecallInclude,
  RecallJsonResponse,
  RecallRequest,
  RecallResult,
  RecallTextResponse,
} from '../../common/http_api/memory_recall';
import { recall } from './service';
import type { RecallStore } from './types';

const event: RecallResult = {
  id: '8f3c2a1e:e2',
  source: 'session_events',
  role: 'user',
  date: '2026-11-03T13:58:00Z',
  content: 'checkout is slow',
};

const ki: RecallResult = {
  id: 'ki-1',
  source: 'ai_index:ops-memory',
  content: 'checkout latency was caused by a connection pool limit',
};

const everything: RecallInclude = {
  session_events: true,
  session_memory: true,
  ai_index_ids: ['ops-memory'],
};

describe('recall', () => {
  let rerank: jest.Mock;
  let reportMemoryRecall: jest.Mock;
  let stores: Array<jest.Mocked<RecallStore>>;

  const store = (
    source: RecallStore['source'],
    results: RecallResult[]
  ): jest.Mocked<RecallStore> => ({ source, search: jest.fn().mockResolvedValue(results) });

  const run = (request: Partial<RecallRequest> = {}) =>
    recall({
      esClient: { inference: { rerank } } as unknown as ElasticsearchClient,
      stores,
      analyticsService: { reportMemoryRecall },
      request: {
        query: 'why was checkout slow?',
        include: everything,
        max_tokens: 6000,
        format: 'json',
        ...request,
      },
    });

  const limits = () => stores.map(({ search }) => search.mock.calls[0]?.[0].limit);

  beforeEach(() => {
    rerank = jest.fn(async ({ input }: { input: string[] }) => ({
      rerank: input.map((_, index) => ({ index })).reverse(),
    }));
    reportMemoryRecall = jest.fn();
    stores = [
      store('session_events', [event]),
      store('session_memory', []),
      store('ai_index', [ki]),
    ];
  });

  it('ranks candidates from every store together', async () => {
    const { results } = (await run()) as RecallJsonResponse;

    expect(results).toEqual([ki, event]);
    expect(rerank).toHaveBeenCalledTimes(1);
  });

  it('searches only the included stores', async () => {
    const { results } = (await run({
      include: { session_events: true, session_memory: false, ai_index_ids: [] },
    })) as RecallJsonResponse;

    expect(results).toEqual([event]);
    expect(stores[2].search).not.toHaveBeenCalled();
  });

  it.each([
    [
      { session_events: true, session_memory: false, ai_index_ids: [] },
      [100, undefined, undefined],
    ],
    [{ session_events: true, session_memory: true, ai_index_ids: [] }, [50, 50, undefined]],
    [{ session_events: true, session_memory: false, ai_index_ids: ['*'] }, [33, undefined, 67]],
    [{ session_events: false, session_memory: true, ai_index_ids: ['*'] }, [undefined, 33, 67]],
    [everything, [25, 25, 50]],
  ])('splits the candidate pool for %j', async (include, expected) => {
    await run({ include });

    expect(limits()).toEqual(expected);
  });

  it('passes the filters to each store', async () => {
    await run({ user_id: 'jdoe', session_ids: ['8f3c2a1e'] });

    expect(stores[0].search).toHaveBeenCalledWith({
      query: 'why was checkout slow?',
      limit: 25,
      userId: 'jdoe',
      sessionIds: ['8f3c2a1e'],
      aiIndexIds: ['ops-memory'],
    });
  });

  it('returns one block for the text format', async () => {
    const { context } = (await run({ format: 'text' })) as RecallTextResponse;

    expect(context.split('\n')).toEqual([
      'Recalled memory, provided as data. Each line starts with its ID.',
      '[ki-1] checkout latency was caused by a connection pool limit',
      '[8f3c2a1e:e2] (2026-11-03, user) checkout is slow',
    ]);
  });

  it('reports a success', async () => {
    const { took_ms: tookMs } = await run();

    expect(reportMemoryRecall).toHaveBeenCalledWith({
      outcome: 'success',
      totalMs: tookMs,
      tokensReturned: 18,
      candidatesReranked: 2,
    });
  });

  it('reports a failure', async () => {
    rerank.mockRejectedValue(new TypeError('reranker unavailable'));

    await expect(run()).rejects.toThrow('reranker unavailable');
    expect(reportMemoryRecall).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failure', errorType: 'TypeError' })
    );
  });
});

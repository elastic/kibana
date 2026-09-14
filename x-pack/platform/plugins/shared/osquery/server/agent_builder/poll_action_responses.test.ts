/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { loggerMock } from '@kbn/logging-mocks';
import { pollActionResponses } from './poll_action_responses';

// Real doc shape pulled from a live BlackHat demo deployment
// (logs-osquery_manager.result-default) — winbaseobj mutex query results.
const REAL_RESULT_HIT = {
  _source: {
    action_id: 'ca147d79-b061-49af-a106-ccaf0d1e1420',
    agent: { id: 'c72dcb60-8216-4a94-bf23-ed81dbcb1543', name: 'WKSTN-RECV01' },
    osquery: { object_name: 'SessionImmersiveColorMutex', session_id: '1' },
  },
};

const buildEsClient = (searchImpl: jest.Mock): ElasticsearchClient =>
  ({ search: searchImpl } as unknown as ElasticsearchClient);

describe('pollActionResponses', () => {
  jest.useFakeTimers();

  afterEach(() => jest.clearAllMocks());

  it('queries the logs-osquery_manager.result* index pattern (not action.responses)', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [REAL_RESULT_HIT] } });
    const promise = pollActionResponses(
      buildEsClient(search),
      'ca147d79-b061-49af-a106-ccaf0d1e1420',
      {
        budgetMs: 5_000,
        intervalMs: 10,
        logger: loggerMock.create(),
      }
    );
    await jest.advanceTimersByTimeAsync(10);
    await promise;

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ index: 'logs-osquery_manager.result*' })
    );
  });

  it('filters on the exact action_id passed in (the nested per-query id, not a parent group id)', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [REAL_RESULT_HIT] } });
    const promise = pollActionResponses(
      buildEsClient(search),
      'ca147d79-b061-49af-a106-ccaf0d1e1420',
      {
        budgetMs: 5_000,
        intervalMs: 10,
      }
    );
    await jest.advanceTimersByTimeAsync(10);
    await promise;

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: { filter: [{ term: { action_id: 'ca147d79-b061-49af-a106-ccaf0d1e1420' } }] },
        },
      })
    );
  });

  it('returns completed status with extracted rows once hits arrive', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [REAL_RESULT_HIT] } });
    const promise = pollActionResponses(
      buildEsClient(search),
      'ca147d79-b061-49af-a106-ccaf0d1e1420',
      {
        budgetMs: 5_000,
        intervalMs: 10,
      }
    );
    await jest.advanceTimersByTimeAsync(10);
    const result = await promise;

    expect(result.status).toBe('completed');
    expect(result.responded).toBe(1);
    expect(result.rows).toEqual([{ object_name: 'SessionImmersiveColorMutex', session_id: '1' }]);
  });

  it('returns pending status (not a false "agent did not respond") when no hits arrive within budget', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const promise = pollActionResponses(buildEsClient(search), 'some-action-id', {
      budgetMs: 30,
      intervalMs: 10,
    });
    await jest.advanceTimersByTimeAsync(30);
    const result = await promise;

    expect(result.status).toBe('pending');
    expect(result.rows).toEqual([]);
    expect(search.mock.calls.length).toBeGreaterThan(0);
  });

  it('keeps polling past transient search errors instead of failing the whole call', async () => {
    const search = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient ES timeout'))
      .mockResolvedValue({ hits: { hits: [REAL_RESULT_HIT] } });
    const promise = pollActionResponses(
      buildEsClient(search),
      'ca147d79-b061-49af-a106-ccaf0d1e1420',
      {
        budgetMs: 5_000,
        intervalMs: 10,
        logger: loggerMock.create(),
      }
    );
    await jest.advanceTimersByTimeAsync(10);
    await jest.advanceTimersByTimeAsync(10);
    const result = await promise;

    expect(result.status).toBe('completed');
    expect(search).toHaveBeenCalledTimes(2);
  });
});

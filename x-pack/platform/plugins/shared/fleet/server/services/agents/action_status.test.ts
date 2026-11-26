/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { ActionStatusOptions } from '../../types';

import { getPage, getPerPage, hasRolloutPeriodPassed, getActionStatuses } from './action_status';

// Needed by getActionStatuses → getActions → addNamespaceFilteringToQuery
jest.mock('../spaces/query_namespaces_filtering', () => ({
  addNamespaceFilteringToQuery: jest.fn((query: object) => Promise.resolve(query)),
}));

describe('getPage', () => {
  it('should return the default value when there are no pagination options', () => {
    const options = {} as ActionStatusOptions;
    expect(getPage(options)).toBe(0);
  });

  it('should return the default value when options.page is undefined', () => {
    const options = { perPage: 5 } as ActionStatusOptions;
    expect(getPage(options)).toBe(0);
  });

  it('should return the default value when options.perPage is undefined', () => {
    const options = { page: 1 } as ActionStatusOptions;
    expect(getPage(options)).toBe(0);
  });

  it('should return a value scaled to options.page and options.perPage', () => {
    const options = { page: 1, perPage: 5 } as ActionStatusOptions;
    expect(getPage(options)).toBe(5);
  });
});

describe('getPerPage', () => {
  it('should return the default value when there are no pagination options', () => {
    const options = {} as ActionStatusOptions;
    expect(getPerPage(options)).toBe(20);
  });

  it('should return the default value when options.page is undefined', () => {
    const options = { perPage: 5 } as ActionStatusOptions;
    expect(getPerPage(options)).toBe(20);
  });

  it('should return the default value when options.perPage is undefined', () => {
    const options = { page: 1 } as ActionStatusOptions;
    expect(getPerPage(options)).toBe(20);
  });

  it('should return a value scaled to options.page and options.perPage', () => {
    const options = { page: 1, perPage: 5 } as ActionStatusOptions;
    expect(getPerPage(options)).toBe(10);
  });
});

describe('hasRolloutPeriodPassed', () => {
  it('should return true when rollout period has passed', () => {
    const source = {
      start_time: '2022-12-30T10:52:24.269Z',
      rollout_duration_seconds: 3600,
      type: 'UPGRADE',
    };
    expect(hasRolloutPeriodPassed(source)).toBe(true);
  });

  it('should return false when rollout period not set', () => {
    const source = {
      start_time: '2022-12-30T10:52:24.269Z',
      type: 'UPGRADE',
    };
    expect(hasRolloutPeriodPassed(source)).toBe(false);
  });

  it('should return false when not upgrade action', () => {
    const source = {
      start_time: '2022-12-30T10:52:24.269Z',
      rollout_duration_seconds: 3600,
      type: 'UNENROLL',
    };
    expect(hasRolloutPeriodPassed(source)).toBe(false);
  });

  it('should return false when rollout period has not passed', () => {
    const source = {
      start_time: new Date().toISOString(),
      rollout_duration_seconds: 3600,
      type: 'UPGRADE',
    };
    expect(hasRolloutPeriodPassed(source)).toBe(false);
  });

  it('should return false when start_time not set', () => {
    const source = {
      rollout_duration_seconds: 3600,
      type: 'UPGRADE',
    };
    expect(hasRolloutPeriodPassed(source)).toBe(false);
  });
});

describe('getActionStatuses version specific policy actions', () => {
  const actionDoc = (actionId: string, agentCount: number, policyId?: string) => ({
    _source: {
      action_id: actionId,
      type: 'POLICY_REASSIGN',
      '@timestamp': '2026-01-01T00:00:00Z',
      agents: Array.from({ length: agentCount }, (_, i) => `${actionId}-agent-${i}`),
      ...(policyId ? { data: { policy_id: policyId } } : {}),
    },
  });

  const makeEsClient = (actionPages: object[][]) => {
    const pages = [...actionPages];
    return {
      openPointInTime: jest.fn().mockResolvedValue({ id: 'pit-id' }),
      closePointInTime: jest.fn().mockResolvedValue({ succeeded: true }),
      search: jest.fn().mockImplementation(async (request: any) => {
        if (request.pit) {
          // getActions reads pages of a point in time, sorted by timestamp
          return { hits: { hits: pages.shift() ?? [] } };
        }
        if (request.index === '.fleet-actions') {
          // getCancelledActions filters on CANCEL
          if (request.sort) {
            return { hits: { hits: pages.shift() ?? [] } };
          }
          return { hits: { hits: [] } };
        }
        if (request.index === '.fleet-actions-results') {
          return {
            hits: { hits: [], total: { value: 0 } },
            aggregations: { ack_counts: { buckets: [] } },
          };
        }
        if (request.index === '.fleet-policies') {
          return { hits: { hits: [] } };
        }
        if (request.index === '.fleet-agents') {
          return { aggregations: { policies: { buckets: [] } } };
        }
        return { hits: { hits: [] } };
      }),
    } as unknown as ElasticsearchClient;
  };

  const getActionsSearches = (esClient: ElasticsearchClient) =>
    (esClient.search as jest.Mock).mock.calls
      .map(([request]) => request)
      .filter((request) => request.pit);

  it('keeps reading action docs until the limit of non-version-specific docs is reached', async () => {
    const sentinelPage = Array.from({ length: 20 }, (_, i) =>
      actionDoc(`sentinel-${i}`, 1, 'p1#9.3')
    );
    const esClient = makeEsClient([
      sentinelPage,
      [actionDoc('A', 10, 'p1'), actionDoc('A', 10, 'p1'), actionDoc('A', 10, 'p1')],
    ]);

    const actions = await getActionStatuses(esClient, { errorSize: 0 });

    expect(actions.map((action) => action.actionId)).toEqual(['A']);
    expect(actions[0].nbAgentsActionCreated).toBe(30);
    const searches = getActionsSearches(esClient);
    expect(searches.map((request) => request.from)).toEqual([0, 20]);
    // stable order between pages when documents share a timestamp
    expect(searches[0].sort).toEqual([{ '@timestamp': 'desc' }, { action_id: 'asc' }]);
    // consistent snapshot between pages, closed afterwards
    expect(searches.every((request) => request.pit.id === 'pit-id')).toBe(true);
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-id' });
  });

  it('uses the latest PIT id returned by a search for the next page and for cleanup', async () => {
    const esClient = makeEsClient([
      Array.from({ length: 20 }, (_, i) => actionDoc(`sentinel-${i}`, 1, 'p1#9.3')),
      [actionDoc('A', 1, 'p1')],
    ]);
    const search = esClient.search as jest.Mock;
    const impl = search.getMockImplementation()!;
    let pitCalls = 0;
    search.mockImplementation(async (request: any) => {
      const res = await impl(request);
      return request.pit ? { ...res, pit_id: `pit-id-${++pitCalls}` } : res;
    });

    await getActionStatuses(esClient, { errorSize: 0 });

    const searches = getActionsSearches(esClient);
    expect(searches.map((request) => request.pit.id)).toEqual(['pit-id', 'pit-id-1']);
    expect(esClient.closePointInTime).toHaveBeenCalledWith({ id: 'pit-id-2' });
  });

  it('keeps all the chunks of an action that spans pages', async () => {
    const esClient = makeEsClient([
      [
        ...Array.from({ length: 9 }, (_, i) => actionDoc(`sentinel-${i}`, 1, 'p1#9.3')),
        ...Array.from({ length: 10 }, (_, i) => actionDoc(`single-${i}`, 1, 'p1')),
        actionDoc('A', 2, 'p1'),
      ],
      Array.from({ length: 10 }, () => actionDoc('A', 2, 'p1')),
    ]);

    const actions = await getActionStatuses(esClient, { errorSize: 0 });

    expect(actions.find((action) => action.actionId === 'A')?.nbAgentsActionCreated).toBe(22);
  });

  it('does a single search when the first page has enough docs', async () => {
    const esClient = makeEsClient([
      Array.from({ length: 20 }, (_, i) => actionDoc(`action-${i}`, 2, 'p1')),
    ]);

    const actions = await getActionStatuses(esClient, { errorSize: 0 });

    expect(actions).toHaveLength(20);
    expect(getActionsSearches(esClient).map((request) => request.from)).toEqual([0]);
  });

  it('does not return version specific policy actions', async () => {
    const esClient = makeEsClient([
      [
        actionDoc('A', 5, 'p1'),
        actionDoc('B', 1, 'p1#9.3'),
        actionDoc('C', 1, 'p1#9.4'),
        actionDoc('D', 3),
      ],
    ]);

    const actions = await getActionStatuses(esClient, { errorSize: 0 });

    expect(actions.map((action) => action.actionId).sort()).toEqual(['A', 'D']);
    expect(getActionsSearches(esClient).map((request) => request.from)).toEqual([0]);
  });
});

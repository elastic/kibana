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

describe('getActionStatuses with scheduledOnly', () => {
  /**
   * Returns a minimal ES client mock. The first `search` call returns `hits`;
   * subsequent calls (e.g. policy-change aggregation in getPolicyChangeActions)
   * return an empty aggregation shape so the code doesn't throw.
   */
  function makeEsClient(hits: object[] = []): ElasticsearchClient {
    const emptyPolicyAggResponse = {
      hits: { hits: [] },
      aggregations: {
        policies: { buckets: [] },
      },
    };
    return {
      openPointInTime: jest.fn().mockResolvedValue({ id: 'pit-id' }),
      closePointInTime: jest.fn().mockResolvedValue({ succeeded: true }),
      search: jest
        .fn()
        .mockResolvedValueOnce({ hits: { hits } })
        .mockResolvedValue(emptyPolicyAggResponse),
    } as unknown as ElasticsearchClient;
  }

  it('includes a start_time gt now filter when scheduledOnly is true', async () => {
    const esClient = makeEsClient();
    const options: ActionStatusOptions = {
      errorSize: 0,
      scheduledOnly: true,
    };

    await getActionStatuses(esClient, options);

    const call = (esClient.search as jest.Mock).mock.calls[0][0];
    const filters: object[] = call.query.bool.filter ?? [];
    const hasStartTimeFilter = filters.some((f: any) => f?.range?.start_time?.gt === 'now');
    expect(hasStartTimeFilter).toBe(true);
  });

  it('does not include a start_time filter when scheduledOnly is false', async () => {
    const esClient = makeEsClient();
    const options: ActionStatusOptions = {
      errorSize: 0,
      scheduledOnly: false,
    };

    await getActionStatuses(esClient, options);

    const call = (esClient.search as jest.Mock).mock.calls[0][0];
    const filters: object[] = call.query.bool.filter ?? [];
    const hasStartTimeFilter = filters.some((f: any) => f?.range?.start_time !== undefined);
    expect(hasStartTimeFilter).toBe(false);
  });

  it('composes scheduledOnly with date filter without losing either', async () => {
    const esClient = makeEsClient();
    const options: ActionStatusOptions = {
      errorSize: 0,
      scheduledOnly: true,
      date: '2025-01-01T00:00:00Z',
    };

    await getActionStatuses(esClient, options);

    const call = (esClient.search as jest.Mock).mock.calls[0][0];
    const filters: object[] = call.query.bool.filter ?? [];
    const hasTimestampFilter = filters.some((f: any) => f?.range?.['@timestamp'] !== undefined);
    const hasStartTimeFilter = filters.some((f: any) => f?.range?.start_time?.gt === 'now');
    expect(hasTimestampFilter).toBe(true);
    expect(hasStartTimeFilter).toBe(true);
  });
});

describe('getActionStatuses policy change actions', () => {
  const policyDoc = (policyId: string, revision: number) => ({
    _source: { policy_id: policyId, revision_idx: revision, '@timestamp': '2026-01-01T00:00:00Z' },
  });

  const makeEsClient = ({
    policyPages,
    agentsAggregations = { policies: { buckets: [] } },
  }: {
    policyPages: object[][];
    agentsAggregations?: object;
  }) => {
    const pages = [...policyPages];
    return {
      openPointInTime: jest.fn().mockResolvedValue({ id: 'pit-id' }),
      closePointInTime: jest.fn().mockResolvedValue({ succeeded: true }),
      search: jest.fn().mockImplementation(async (request: { index?: string }) => {
        if (request.index === '.fleet-policies') {
          return { hits: { hits: pages.shift() ?? [] } };
        }
        if (request.index === '.fleet-agents') {
          return { aggregations: agentsAggregations };
        }
        return { hits: { hits: [] } };
      }),
    } as unknown as ElasticsearchClient;
  };

  const getPolicyChangeActions = async (esClient: ElasticsearchClient) =>
    (await getActionStatuses(esClient, { errorSize: 0 })).filter(
      (action) => action.type === 'POLICY_CHANGE'
    );

  it('keeps reading policy docs until the limit of base policy docs is reached', async () => {
    const sentinelPage = Array.from({ length: 20 }, (_, i) => policyDoc('p1#sentinel', i + 2));
    const esClient = makeEsClient({
      policyPages: [sentinelPage, [policyDoc('p1', 3), policyDoc('p1#sentinel', 3)]],
    });

    const actions = await getPolicyChangeActions(esClient);

    expect(actions.map((action) => action.actionId)).toEqual(['p1:3']);
    const policySearches = (esClient.search as jest.Mock).mock.calls
      .map(([request]) => request)
      .filter((request) => request.index === '.fleet-policies');
    expect(policySearches.map((request) => request.from)).toEqual([0, 20]);
    // stable order between pages when documents share a timestamp
    expect(policySearches[0].sort).toEqual([
      { '@timestamp': { order: 'desc' } },
      { policy_id: { order: 'asc' } },
      { revision_idx: { order: 'asc' } },
    ]);
  });

  it('does not return version specific and sentinel policy docs', async () => {
    const esClient = makeEsClient({
      policyPages: [[policyDoc('p1', 3), policyDoc('p1#sentinel', 3), policyDoc('p1#9.4', 3)]],
    });

    const actions = await getPolicyChangeActions(esClient);

    expect(actions.map((action) => action.actionId)).toEqual(['p1:3']);
  });

  it('counts agents on #sentinel and version specific policies for the base policy', async () => {
    const esClient = makeEsClient({
      policyPages: [[policyDoc('p1', 3)]],
      agentsAggregations: {
        policies: {
          buckets: [
            {
              key: 'p1',
              doc_count: 3,
              agents_per_rev: {
                buckets: [
                  { key: 2, doc_count: 1 },
                  { key: 3, doc_count: 2 },
                ],
              },
            },
          ],
        },
        legacy_policies: {
          policies: {
            buckets: [
              { key: 'p1', doc_count: 1, agents_per_rev: { buckets: [{ key: 3, doc_count: 1 }] } },
            ],
          },
        },
      },
    });

    const [action] = await getPolicyChangeActions(esClient);

    expect(action).toEqual(
      expect.objectContaining({
        policyId: 'p1',
        revision: 3,
        nbAgentsActioned: 4,
        nbAgentsAck: 3,
        status: 'IN_PROGRESS',
      })
    );
    const agentsSearch = (esClient.search as jest.Mock).mock.calls
      .map(([request]) => request)
      .find((request) => request.index === '.fleet-agents');
    expect(agentsSearch.aggs.policies.terms.field).toBe('policy_base_id');
    expect(JSON.stringify(agentsSearch.query)).toContain('"policy_base_id":["p1"]');
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
      actionDoc(`sentinel-${i}`, 1, 'p1#sentinel')
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
      Array.from({ length: 20 }, (_, i) => actionDoc(`sentinel-${i}`, 1, 'p1#sentinel')),
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
        ...Array.from({ length: 9 }, (_, i) => actionDoc(`sentinel-${i}`, 1, 'p1#sentinel')),
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
        actionDoc('B', 1, 'p1#sentinel'),
        actionDoc('C', 1, 'p1#9.4'),
        actionDoc('D', 3),
      ],
    ]);

    const actions = await getActionStatuses(esClient, { errorSize: 0 });

    expect(actions.map((action) => action.actionId).sort()).toEqual(['A', 'D']);
    expect(getActionsSearches(esClient).map((request) => request.from)).toEqual([0]);
  });
});

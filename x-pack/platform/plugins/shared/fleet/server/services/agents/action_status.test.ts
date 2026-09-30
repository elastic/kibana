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

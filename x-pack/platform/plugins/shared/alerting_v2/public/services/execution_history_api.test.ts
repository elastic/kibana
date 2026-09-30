/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { ListPolicyExecutionHistoryResponse } from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH,
  ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH,
} from '../constants';
import { ExecutionHistoryApi } from './execution_history_api';

const buildResponse = (
  overrides: Partial<ListPolicyExecutionHistoryResponse> = {}
): ListPolicyExecutionHistoryResponse => ({
  items: [],
  page: 1,
  per_page: 50,
  total: 0,
  search_matches: null,
  ...overrides,
});

describe('ExecutionHistoryApi', () => {
  const buildApi = () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue(buildResponse());
    const api = new ExecutionHistoryApi(http);
    return { api, http };
  };

  it('GETs the action policy execution history endpoint', async () => {
    const { api, http } = buildApi();

    await api.listActionPolicyExecutions();

    expect(http.get).toHaveBeenCalledWith(
      ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH,
      expect.any(Object)
    );
  });

  it('forwards page, perPage, search, outcome, from, to and sort params as query params', async () => {
    const { api, http } = buildApi();

    await api.listActionPolicyExecutions({
      page: 3,
      per_page: 25,
      search: 'foo',
      outcomes: ['throttled'],
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
      sort_field: 'dispatched_at',
      sort_order: 'asc',
    });

    expect(http.get).toHaveBeenCalledWith(ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH, {
      query: {
        page: 3,
        per_page: 25,
        search: 'foo',
        rule_ids: undefined,
        outcomes: ['throttled'],
        episode_ids: undefined,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
        sort_field: 'dispatched_at',
        sort_order: 'asc',
      },
    });
  });

  it('passes undefined query params when not provided', async () => {
    const { api, http } = buildApi();

    await api.listActionPolicyExecutions();

    expect(http.get).toHaveBeenCalledWith(ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH, {
      query: {
        page: undefined,
        per_page: undefined,
        search: undefined,
        rule_ids: undefined,
        outcomes: undefined,
        episode_ids: undefined,
        from: undefined,
        to: undefined,
        sort_field: undefined,
        sort_order: undefined,
      },
    });
  });

  it('supports a count-only read via perPage=0 and from', async () => {
    const { api, http } = buildApi();

    await api.listActionPolicyExecutions({ from: '2026-01-01T00:00:00.000Z', per_page: 0 });

    expect(http.get).toHaveBeenCalledWith(
      ALERTING_V2_ACTION_POLICY_EXECUTION_HISTORY_API_PATH,
      expect.objectContaining({
        query: expect.objectContaining({ per_page: 0, from: '2026-01-01T00:00:00.000Z' }),
      })
    );
  });

  it('returns the response from http.get', async () => {
    const { api, http } = buildApi();
    const fakeResponse = {
      items: [{ dispatched_at: '2026-05-05T10:00:00Z' }],
      page: 2,
      per_page: 25,
      total: 137,
    };
    http.get.mockResolvedValueOnce(fakeResponse);

    await expect(api.listActionPolicyExecutions({ page: 2, per_page: 25 })).resolves.toEqual(
      fakeResponse
    );
  });

  it('propagates errors from http.get', async () => {
    const { api, http } = buildApi();
    http.get.mockRejectedValueOnce(new Error('boom'));

    await expect(api.listActionPolicyExecutions()).rejects.toThrow('boom');
  });

  it('GETs the rule execution history endpoint', async () => {
    const { api, http } = buildApi();

    await api.listRuleExecutions({ page: 1, per_page: 10 });

    expect(http.get).toHaveBeenCalledWith(
      ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH,
      expect.any(Object)
    );
  });

  it('forwards all query params to listRuleExecutions', async () => {
    const { api, http } = buildApi();

    const params = {
      rule_ids: ['r1', 'r2'],
      outcomes: ['failure' as const],
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T00:00:00Z',
      sort_field: 'duration_ms' as const,
      sort_order: 'asc' as const,
      page: 3,
      per_page: 50,
    };

    await api.listRuleExecutions(params);

    expect(http.get).toHaveBeenCalledWith(ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH, {
      query: params,
    });
  });
});

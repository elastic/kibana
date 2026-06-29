/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH } from '../constants';
import { RuleExecutionHistoryApi } from './rule_execution_history_api';

describe('RuleExecutionHistoryApi', () => {
  const http = httpServiceMock.createStartContract();
  const api = new RuleExecutionHistoryApi(http);

  beforeEach(() => {
    jest.clearAllMocks();
    http.get.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 20 });
  });

  it('GETs the rule execution history endpoint', async () => {
    await api.getRuleExecutions({ page: 1, perPage: 10 });

    expect(http.get).toHaveBeenCalledWith(
      ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH,
      expect.any(Object)
    );
  });

  it('forwards all query params', async () => {
    const params = {
      ruleId: ['r1', 'r2'],
      outcome: ['failure' as const],
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T00:00:00Z',
      sort: 'duration' as const,
      sortOrder: 'asc' as const,
      page: 3,
      perPage: 50,
    };

    await api.getRuleExecutions(params);

    expect(http.get).toHaveBeenCalledWith(ALERTING_V2_EXECUTION_HISTORY_RULES_API_PATH, {
      query: params,
    });
  });

  it('returns the response from http.get', async () => {
    const fakeResponse = {
      items: [{ id: 'exec-1', startedAt: '2026-05-05T10:00:00Z' }],
      total: 1,
      page: 1,
      perPage: 20,
    };
    http.get.mockResolvedValueOnce(fakeResponse);

    await expect(api.getRuleExecutions({ page: 1, perPage: 20 })).resolves.toEqual(fakeResponse);
  });
});

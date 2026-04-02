/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useAlertingRulesCache } from './use_alerting_rules_cache';
import type { FindRulesResponse } from '@kbn/alerting-v2-plugin/public/services/rules_api';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

jest.mock('react-use/lib/useAsync', () => ({
  __esModule: true,
  default: jest.fn((fn: () => Promise<void>) => {
    const result = fn();
    return { loading: false, error: undefined, value: result };
  }),
}));

const mockHttp = httpServiceMock.createStartContract();

describe('useAlertingRulesCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached rules for already fetched rule IDs', async () => {
    const ruleId = 'rule-1';
    const fetchedRule = {
      id: ruleId,
      name: 'Fetched Rule',
    } as unknown as FindRulesResponse['items'][number];
    mockHttp.get.mockResolvedValue({
      items: [fetchedRule],
    } as FindRulesResponse);

    const { result, rerender } = renderHook(
      ({ ruleIds }: { ruleIds: string[] } = { ruleIds: [ruleId] }) =>
        useAlertingRulesCache({
          ruleIds,
          services: { http: mockHttp },
        })
    );

    await waitFor(() => expect(result.current.rulesCache).toEqual({ [ruleId]: fetchedRule }));

    rerender({ ruleIds: [ruleId] });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(mockHttp.get).toHaveBeenCalledTimes(1);
  });

  it('should fetch rules for uncached rule IDs', async () => {
    const ruleId = 'rule-2';
    const fetchedRule = {
      id: ruleId,
      name: 'Fetched Rule',
    } as unknown as FindRulesResponse['items'][number];
    mockHttp.get.mockResolvedValue({
      items: [fetchedRule],
    } as FindRulesResponse);

    const { result } = renderHook(() =>
      useAlertingRulesCache({
        ruleIds: [ruleId],
        services: { http: mockHttp },
      })
    );

    await waitFor(() =>
      expect(mockHttp.get).toHaveBeenCalledWith(`${ALERTING_V2_RULE_API_PATH}/_bulk`, {
        query: { ids: [ruleId] },
      })
    );
    expect(result.current.rulesCache).toEqual({ [ruleId]: fetchedRule });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle empty rule IDs array gracefully', async () => {
    const { result } = renderHook(() =>
      useAlertingRulesCache({
        ruleIds: [],
        services: { http: mockHttp },
      })
    );

    expect(mockHttp.get).not.toHaveBeenCalled();
    expect(result.current.rulesCache).toEqual({});
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });
});

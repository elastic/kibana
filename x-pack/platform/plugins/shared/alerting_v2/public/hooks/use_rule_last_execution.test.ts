/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useRuleLastExecution } from './use_rule_last_execution';

const mockUseFetchRuleExecutions = jest.fn();
jest.mock('./use_fetch_rule_executions', () => ({
  useFetchRuleExecutions: (...args: unknown[]) => mockUseFetchRuleExecutions(...args),
}));

let mockCanReadExecutionHistory = true;
jest.mock('@kbn/core-di-browser', () => ({
  useService: () => ({
    canRead: (feature: string) =>
      feature === 'executionHistory' ? mockCanReadExecutionHistory : true,
  }),
}));

jest.mock('../services/user_capabilities', () => ({
  UserCapabilities: 'UserCapabilities',
}));

describe('useRuleLastExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanReadExecutionHistory = true;
    mockUseFetchRuleExecutions.mockReturnValue({
      data: { items: [], total: 0, page: 1, per_page: 1 },
      isLoading: false,
      isError: false,
    });
  });

  it('requests the newest execution when execution history is readable', () => {
    const { result } = renderHook(() => useRuleLastExecution('rule-1'));

    expect(mockUseFetchRuleExecutions).toHaveBeenCalledWith({
      ruleIds: ['rule-1'],
      perPage: 1,
      sortField: 'startedAt',
      sortOrder: 'desc',
      enabled: true,
      keepPreviousData: false,
    });
    expect(result.current).toEqual({
      visible: true,
      isLoading: false,
      isError: false,
      value: '-',
      outcome: undefined,
    });
  });

  it('hides the value and disables the fetch without execution-history read', () => {
    mockCanReadExecutionHistory = false;

    const { result } = renderHook(() => useRuleLastExecution('rule-1'));

    expect(result.current).toEqual({
      visible: false,
      isLoading: false,
      isError: false,
      value: undefined,
      outcome: undefined,
    });
    expect(mockUseFetchRuleExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it('omits the outcome value while the fetch is in flight', () => {
    mockUseFetchRuleExecutions.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    const { result } = renderHook(() => useRuleLastExecution('rule-1'));

    expect(result.current).toEqual({
      visible: true,
      isLoading: true,
      isError: false,
      value: undefined,
      outcome: undefined,
    });
  });

  it('ignores a leftover outcome while the fetch is in flight', () => {
    mockUseFetchRuleExecutions.mockReturnValue({
      data: { items: [{ outcome: 'failure' }], total: 1, page: 1, per_page: 1 },
      isLoading: true,
      isError: false,
    });

    const { result } = renderHook(() => useRuleLastExecution('rule-1'));

    expect(result.current.value).toBeUndefined();
    expect(result.current.outcome).toBeUndefined();
    expect(result.current.isError).toBe(false);
  });

  it('reports Unavailable without an outcome when the request fails', () => {
    mockUseFetchRuleExecutions.mockReturnValue({
      data: { items: [{ outcome: 'success' }], total: 1, page: 1, per_page: 1 },
      isLoading: false,
      isError: true,
    });

    const { result } = renderHook(() => useRuleLastExecution('rule-1'));

    expect(result.current).toEqual({
      visible: true,
      isLoading: false,
      isError: true,
      value: 'Unavailable',
      outcome: undefined,
    });
  });

  it('maps a successful run to Succeeded', () => {
    mockUseFetchRuleExecutions.mockReturnValue({
      data: { items: [{ outcome: 'success' }], total: 1, page: 1, per_page: 1 },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useRuleLastExecution('rule-1'));

    expect(result.current).toEqual({
      visible: true,
      isLoading: false,
      isError: false,
      value: 'Succeeded',
      outcome: 'success',
    });
  });

  it('maps a failed run to Failed', () => {
    mockUseFetchRuleExecutions.mockReturnValue({
      data: { items: [{ outcome: 'failure' }], total: 1, page: 1, per_page: 1 },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useRuleLastExecution('rule-1'));

    expect(result.current).toEqual({
      visible: true,
      isLoading: false,
      isError: false,
      value: 'Failed',
      outcome: 'failure',
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useBulkEnableRules, useBulkDisableRules } from './use_bulk_enable_disable_rules';

const mockBulkEnableRules = jest.fn();
const mockBulkDisableRules = jest.fn();
const mockEnableRulesByQuery = jest.fn();
const mockDisableRulesByQuery = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddWarning = jest.fn();
const mockAddDanger = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'notifications') {
      return {
        toasts: {
          addSuccess: mockAddSuccess,
          addWarning: mockAddWarning,
          addDanger: mockAddDanger,
        },
      };
    }
    // RulesApi
    return {
      bulkEnableRules: mockBulkEnableRules,
      bulkDisableRules: mockBulkDisableRules,
      enableRulesByQuery: mockEnableRulesByQuery,
      disableRulesByQuery: mockDisableRulesByQuery,
    };
  },
  CoreStart: (key: string) => key,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useBulkEnableRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the by-ID endpoint with the provided ids', async () => {
    mockBulkEnableRules.mockResolvedValueOnce({ affected_count: 2, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkEnableRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1', 'rule-2'] });
    });

    expect(mockBulkEnableRules).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });
    expect(mockEnableRulesByQuery).not.toHaveBeenCalled();
  });

  it('calls the by-query endpoint with force=true when using match_all', async () => {
    mockEnableRulesByQuery.mockResolvedValueOnce({ affected_count: 5, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkEnableRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_query', match_all: true });
    });

    expect(mockEnableRulesByQuery).toHaveBeenCalledWith({ match_all: true, force: true });
    expect(mockBulkEnableRules).not.toHaveBeenCalled();
  });

  it('shows success toast with affected_count when all rules are enabled', async () => {
    mockBulkEnableRules.mockResolvedValueOnce({ affected_count: 3, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkEnableRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
    });

    expect(mockAddSuccess).toHaveBeenCalledWith('3 rules enabled successfully');
  });

  it('shows warning toast when there are partial errors', async () => {
    mockBulkEnableRules.mockResolvedValueOnce({
      affected_count: 0,
      errors: [{ id: 'rule-2', error: { code: 'RULE_VERSION_CONFLICT', message: 'Conflict' } }],
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkEnableRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1', 'rule-2'] });
    });

    expect(mockAddWarning).toHaveBeenCalledWith(expect.stringContaining('1 error'));
    expect(mockAddSuccess).not.toHaveBeenCalled();
  });

  it('shows danger toast when the mutation fails', async () => {
    mockBulkEnableRules.mockRejectedValueOnce(new Error('Network error'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkEnableRules(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
      } catch {
        // expected
      }
    });

    expect(mockAddDanger).toHaveBeenCalledWith('Failed to enable rules');
  });

  it('shows danger toast with title and server message when HTTP error body has message', async () => {
    mockBulkEnableRules.mockRejectedValueOnce({ body: { message: 'Invalid request body' } });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkEnableRules(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
      } catch {
        // expected
      }
    });

    expect(mockAddDanger).toHaveBeenCalledWith({
      title: 'Failed to enable rules',
      text: 'Invalid request body',
    });
  });

  it('invalidates rule list queries on success', async () => {
    mockBulkEnableRules.mockResolvedValueOnce({ affected_count: 1, errors: [] });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBulkEnableRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'list']);
  });
});

describe('useBulkDisableRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the by-ID endpoint with the provided ids', async () => {
    mockBulkDisableRules.mockResolvedValueOnce({ affected_count: 2, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDisableRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1', 'rule-2'] });
    });

    expect(mockBulkDisableRules).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });
    expect(mockDisableRulesByQuery).not.toHaveBeenCalled();
  });

  it('calls the by-query endpoint with force=true when using a filter', async () => {
    mockDisableRulesByQuery.mockResolvedValueOnce({ affected_count: 5, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDisableRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_query', filter: 'enabled: true' });
    });

    expect(mockDisableRulesByQuery).toHaveBeenCalledWith({
      filter: 'enabled: true',
      force: true,
    });
    expect(mockBulkDisableRules).not.toHaveBeenCalled();
  });

  it('shows success toast with affected_count when all rules are disabled', async () => {
    mockBulkDisableRules.mockResolvedValueOnce({ affected_count: 2, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDisableRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
    });

    expect(mockAddSuccess).toHaveBeenCalledWith('2 rules disabled successfully');
  });

  it('shows warning toast when there are partial errors', async () => {
    mockBulkDisableRules.mockResolvedValueOnce({
      affected_count: 0,
      errors: [
        { id: 'rule-1', error: { code: 'RULE_NOT_FOUND', message: 'Not found' } },
        { id: 'rule-2', error: { code: 'RULE_VERSION_CONFLICT', message: 'Conflict' } },
      ],
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDisableRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1', 'rule-2'] });
    });

    expect(mockAddWarning).toHaveBeenCalledWith(expect.stringContaining('2 errors'));
    expect(mockAddSuccess).not.toHaveBeenCalled();
  });

  it('shows danger toast when the mutation fails', async () => {
    mockBulkDisableRules.mockRejectedValueOnce(new Error('Network error'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDisableRules(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
      } catch {
        // expected
      }
    });

    expect(mockAddDanger).toHaveBeenCalledWith('Failed to disable rules');
  });

  it('shows danger toast with title and server message when HTTP error body has message', async () => {
    mockBulkDisableRules.mockRejectedValueOnce({ body: { message: 'Something went wrong' } });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDisableRules(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
      } catch {
        // expected
      }
    });

    expect(mockAddDanger).toHaveBeenCalledWith({
      title: 'Failed to disable rules',
      text: 'Something went wrong',
    });
  });

  it('invalidates rule list queries on success', async () => {
    mockBulkDisableRules.mockResolvedValueOnce({ affected_count: 1, errors: [] });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBulkDisableRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'list']);
  });
});

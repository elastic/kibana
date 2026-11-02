/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useBulkDeleteRules } from './use_bulk_delete_rules';

const mockBulkDeleteRules = jest.fn();
const mockDeleteRulesByQuery = jest.fn();
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
      bulkDeleteRules: mockBulkDeleteRules,
      deleteRulesByQuery: mockDeleteRulesByQuery,
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

describe('useBulkDeleteRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the by-ID endpoint with the provided ids', async () => {
    mockBulkDeleteRules.mockResolvedValueOnce({ affected_count: 2, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1', 'rule-2'] });
    });

    expect(mockBulkDeleteRules).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });
    expect(mockDeleteRulesByQuery).not.toHaveBeenCalled();
  });

  it('calls the by-query endpoint with force=true when using match_all', async () => {
    mockDeleteRulesByQuery.mockResolvedValueOnce({ affected_count: 5, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_query', match_all: true });
    });

    expect(mockDeleteRulesByQuery).toHaveBeenCalledWith({ match_all: true, force: true });
    expect(mockBulkDeleteRules).not.toHaveBeenCalled();
  });

  it('shows success toast with affected_count when all rules are deleted', async () => {
    mockBulkDeleteRules.mockResolvedValueOnce({ affected_count: 3, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
    });

    expect(mockAddSuccess).toHaveBeenCalledWith('3 rules deleted successfully');
  });

  it('shows warning toast when there are partial errors', async () => {
    mockBulkDeleteRules.mockResolvedValueOnce({
      affected_count: 1,
      errors: [{ id: 'rule-2', error: { code: 'RULE_NOT_FOUND', message: 'Not found' } }],
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1', 'rule-2'] });
    });

    expect(mockAddWarning).toHaveBeenCalledWith(expect.stringContaining('1 error'));
    expect(mockAddSuccess).not.toHaveBeenCalled();
  });

  it('shows danger toast when the mutation fails', async () => {
    mockBulkDeleteRules.mockRejectedValueOnce(new Error('Network error'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
      } catch {
        // expected
      }
    });

    expect(mockAddDanger).toHaveBeenCalledWith('Failed to delete rules');
  });

  it('shows danger toast with title and server message when HTTP error body has message', async () => {
    mockBulkDeleteRules.mockRejectedValueOnce({ body: { message: 'Forbidden' } });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
      } catch {
        // expected
      }
    });

    expect(mockAddDanger).toHaveBeenCalledWith({
      title: 'Failed to delete rules',
      text: 'Forbidden',
    });
  });

  it('invalidates rule list queries on success', async () => {
    mockBulkDeleteRules.mockResolvedValueOnce({ affected_count: 1, errors: [] });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'list']);
  });
});

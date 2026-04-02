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
    return { bulkDeleteRules: mockBulkDeleteRules };
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

  it('calls bulkDeleteRules with the provided ids', async () => {
    mockBulkDeleteRules.mockResolvedValueOnce({ rules: [], errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ids: ['rule-1', 'rule-2'] });
    });

    expect(mockBulkDeleteRules).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });
  });

  it('shows success toast when all rules are deleted', async () => {
    mockBulkDeleteRules.mockResolvedValueOnce({ rules: [], errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ids: ['rule-1'] });
    });

    expect(mockAddSuccess).toHaveBeenCalledWith('Rules deleted successfully');
  });

  it('shows warning toast when there are partial errors', async () => {
    mockBulkDeleteRules.mockResolvedValueOnce({
      rules: [],
      errors: [{ id: 'rule-2', error: { message: 'Not found', statusCode: 404 } }],
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ids: ['rule-1', 'rule-2'] });
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
        await result.current.mutateAsync({ ids: ['rule-1'] });
      } catch {
        // expected
      }
    });

    expect(mockAddDanger).toHaveBeenCalledWith('Failed to delete rules');
  });

  it('invalidates rule list queries on success', async () => {
    mockBulkDeleteRules.mockResolvedValueOnce({ rules: [], errors: [] });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBulkDeleteRules(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ids: ['rule-1'] });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'list']);
  });
});

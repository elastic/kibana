/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useBulkUpdateRuleApiKey } from './use_bulk_update_rule_api_key';

const mockBulkUpdateRuleApiKey = jest.fn();
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
      bulkUpdateRuleApiKey: mockBulkUpdateRuleApiKey,
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

describe('useBulkUpdateRuleApiKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the endpoint with the provided ids', async () => {
    mockBulkUpdateRuleApiKey.mockResolvedValueOnce({ affected_count: 2, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ids: ['rule-1', 'rule-2'] });
    });

    expect(mockBulkUpdateRuleApiKey).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });
  });

  it('shows success toast with affected_count when all keys are rotated', async () => {
    mockBulkUpdateRuleApiKey.mockResolvedValueOnce({ affected_count: 3, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ids: ['rule-1'] });
    });

    expect(mockAddSuccess).toHaveBeenCalledWith('API key updated for 3 rules');
  });

  it('shows warning toast when there are partial errors', async () => {
    mockBulkUpdateRuleApiKey.mockResolvedValueOnce({
      affected_count: 1,
      errors: [{ id: 'rule-2', error: { code: 'RULE_NOT_FOUND', message: 'Not found' } }],
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ids: ['rule-1', 'rule-2'] });
    });

    expect(mockAddWarning).toHaveBeenCalledWith(expect.stringContaining('1 error'));
    expect(mockAddSuccess).not.toHaveBeenCalled();
  });

  it('shows danger toast when the mutation fails', async () => {
    mockBulkUpdateRuleApiKey.mockRejectedValueOnce(new Error('Network error'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ ids: ['rule-1'] });
      } catch {
        // expected
      }
    });

    expect(mockAddDanger).toHaveBeenCalledWith('Failed to update API key');
  });

  it('shows danger toast with title and server message when HTTP error body has message', async () => {
    mockBulkUpdateRuleApiKey.mockRejectedValueOnce({
      body: { message: 'Failed to grant API key' },
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ ids: ['rule-1'] });
      } catch {
        // expected
      }
    });

    expect(mockAddDanger).toHaveBeenCalledWith({
      title: 'Failed to update API key',
      text: 'Failed to grant API key',
    });
  });

  it('invalidates the rule list and each rule detail query on success', async () => {
    mockBulkUpdateRuleApiKey.mockResolvedValueOnce({ affected_count: 2, errors: [] });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ ids: ['rule-1', 'rule-2'] });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'list']);
    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'details', 'rule-1']);
    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'details', 'rule-2']);
  });
});

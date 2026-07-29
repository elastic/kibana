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
const mockUpdateRuleApiKeyByQuery = jest.fn();
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
      updateRuleApiKeyByQuery: mockUpdateRuleApiKeyByQuery,
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
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1', 'rule-2'] });
    });

    expect(mockBulkUpdateRuleApiKey).toHaveBeenCalledWith({ ids: ['rule-1', 'rule-2'] });
  });

  it('shows success toast with affected_count when all keys are rotated', async () => {
    mockBulkUpdateRuleApiKey.mockResolvedValueOnce({ affected_count: 3, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
    });

    expect(mockAddSuccess).toHaveBeenCalledWith('API key updated for 3 rules');
  });

  it('shows warning toast with a count title and reason breakdown on partial errors', async () => {
    mockBulkUpdateRuleApiKey.mockResolvedValueOnce({
      affected_count: 1,
      errors: [{ id: 'rule-2', error: { code: 'RULE_NOT_FOUND', message: 'Not found' } }],
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1', 'rule-2'] });
    });

    expect(mockAddWarning).toHaveBeenCalledWith({
      title: expect.stringContaining('1 error'),
      text: '1 rule not found',
    });
    expect(mockAddSuccess).not.toHaveBeenCalled();
  });

  it('groups the partial-error reasons by code in the warning text', async () => {
    mockBulkUpdateRuleApiKey.mockResolvedValueOnce({
      affected_count: 1,
      errors: [
        { id: 'rule-2', error: { code: 'RULE_DISABLED', message: 'Disabled' } },
        { id: 'rule-3', error: { code: 'RULE_DISABLED', message: 'Disabled' } },
        { id: 'rule-4', error: { code: 'RULE_NOT_FOUND', message: 'Not found' } },
      ],
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        mode: 'by_ids',
        ids: ['rule-1', 'rule-2', 'rule-3', 'rule-4'],
      });
    });

    expect(mockAddWarning).toHaveBeenCalledWith({
      title: expect.stringContaining('3 errors'),
      text: '2 disabled rules, 1 rule not found',
    });
  });

  it('surfaces running rules in the partial-error breakdown', async () => {
    mockBulkUpdateRuleApiKey.mockResolvedValueOnce({
      affected_count: 0,
      errors: [
        { id: 'rule-1', error: { code: 'RULE_ALREADY_RUNNING', message: 'Running' } },
        { id: 'rule-2', error: { code: 'RULE_ALREADY_RUNNING', message: 'Running' } },
      ],
    });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1', 'rule-2'] });
    });

    expect(mockAddWarning).toHaveBeenCalledWith({
      title: expect.stringContaining('2 errors'),
      text: expect.stringContaining('2 rules currently running'),
    });
  });

  it('shows danger toast when the mutation fails', async () => {
    mockBulkUpdateRuleApiKey.mockRejectedValueOnce(new Error('Network error'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
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
        await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1'] });
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
      await result.current.mutateAsync({ mode: 'by_ids', ids: ['rule-1', 'rule-2'] });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'list']);
    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'details', 'rule-1']);
    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'details', 'rule-2']);
  });

  it('ANDs an enabled-only clause onto a by_query filter and dispatches with force=true', async () => {
    mockUpdateRuleApiKeyByQuery.mockResolvedValueOnce({ affected_count: 5, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_query', filter: 'kind: alert' });
    });

    expect(mockUpdateRuleApiKeyByQuery).toHaveBeenCalledWith({
      filter: '(kind: alert) AND enabled: true',
      force: true,
    });
    expect(mockBulkUpdateRuleApiKey).not.toHaveBeenCalled();
  });

  it('replaces match_all with an enabled-only filter for a select-all by_query selection', async () => {
    mockUpdateRuleApiKeyByQuery.mockResolvedValueOnce({ affected_count: 5, errors: [] });
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_query', match_all: true });
    });

    expect(mockUpdateRuleApiKeyByQuery).toHaveBeenCalledWith({
      filter: 'enabled: true',
      force: true,
    });
  });

  it('does not invalidate detail queries for a by_query selection (ids are unknown)', async () => {
    mockUpdateRuleApiKeyByQuery.mockResolvedValueOnce({ affected_count: 5, errors: [] });
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useBulkUpdateRuleApiKey(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ mode: 'by_query', match_all: true });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(['rule', 'list']);
    expect(invalidateSpy).not.toHaveBeenCalledWith(expect.arrayContaining(['rule', 'details']));
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useToggleRuleEnabled } from './use_toggle_rule_enabled';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';

jest.mock('@kbn/core-di-browser');
jest.mock('../services/rules_api');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const mockEnabledRuleResponse: RuleResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: {
    name: 'My CPU Alert',
    description: '',
    tags: [],
  },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
  createdBy: 'test-user',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'test-user',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useToggleRuleEnabled', () => {
  const mockUpdateRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { updateRule: mockUpdateRule } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addDanger: mockAddDanger } } as any;
      }
      return undefined as any;
    });
  });

  it('should show an enabled toast with the rule name when enabling', async () => {
    mockUpdateRule.mockResolvedValue(mockEnabledRuleResponse);
    const { result } = renderHook(() => useToggleRuleEnabled(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1', enabled: true });

    await waitFor(() => {
      expect(mockUpdateRule).toHaveBeenCalledWith('rule-1', { enabled: true });
      expect(mockAddSuccess).toHaveBeenCalledWith('Rule "My CPU Alert" enabled');
      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });

  it('should show a disabled toast with the rule name when disabling', async () => {
    mockUpdateRule.mockResolvedValue({ ...mockEnabledRuleResponse, enabled: false });
    const { result } = renderHook(() => useToggleRuleEnabled(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1', enabled: false });

    await waitFor(() => {
      expect(mockUpdateRule).toHaveBeenCalledWith('rule-1', { enabled: false });
      expect(mockAddSuccess).toHaveBeenCalledWith('Rule "My CPU Alert" disabled');
      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });

  it('should show a danger toast when the toggle fails', async () => {
    mockUpdateRule.mockRejectedValue(new Error('toggle failed'));
    const { result } = renderHook(() => useToggleRuleEnabled(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1', enabled: true });

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith(expect.any(String));
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });

  it('stays in a loading state until the invalidated queries have refetched', async () => {
    mockUpdateRule.mockResolvedValue(mockEnabledRuleResponse);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    let resolveInvalidate: () => void = () => {};
    const invalidatePromise = new Promise<void>((resolve) => {
      resolveInvalidate = resolve;
    });
    jest.spyOn(queryClient, 'invalidateQueries').mockReturnValue(invalidatePromise);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useToggleRuleEnabled(), { wrapper });

    result.current.mutate({ id: 'rule-1', enabled: true });

    // The success toast fires synchronously before invalidation is awaited, so once
    // it has been called we know the mutation is now blocked on the invalidation promise.
    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalled());
    expect(result.current.isLoading).toBe(true);

    resolveInvalidate();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

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
import type { BulkResponse } from '@kbn/alerting-v2-schemas';

jest.mock('@kbn/core-di-browser');
jest.mock('../services/rules_api');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const successResponse: BulkResponse = { affected_count: 1, errors: [] };

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
  const mockBulkEnableRules = jest.fn();
  const mockBulkDisableRules = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return {
          bulkEnableRules: mockBulkEnableRules,
          bulkDisableRules: mockBulkDisableRules,
        } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addDanger: mockAddDanger } } as any;
      }
      return undefined as any;
    });
  });

  it('calls bulkEnableRules and shows an enabled toast with the rule name when enabling', async () => {
    mockBulkEnableRules.mockResolvedValue(successResponse);
    const { result } = renderHook(() => useToggleRuleEnabled(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1', enabled: true, name: 'My CPU Alert' });

    await waitFor(() => {
      expect(mockBulkEnableRules).toHaveBeenCalledWith({ ids: ['rule-1'] });
      expect(mockBulkDisableRules).not.toHaveBeenCalled();
      expect(mockAddSuccess).toHaveBeenCalledWith('Rule "My CPU Alert" enabled');
      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });

  it('calls bulkDisableRules and shows a disabled toast with the rule name when disabling', async () => {
    mockBulkDisableRules.mockResolvedValue(successResponse);
    const { result } = renderHook(() => useToggleRuleEnabled(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1', enabled: false, name: 'My CPU Alert' });

    await waitFor(() => {
      expect(mockBulkDisableRules).toHaveBeenCalledWith({ ids: ['rule-1'] });
      expect(mockBulkEnableRules).not.toHaveBeenCalled();
      expect(mockAddSuccess).toHaveBeenCalledWith('Rule "My CPU Alert" disabled');
      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });

  it('shows a danger toast when the toggle request rejects', async () => {
    mockBulkEnableRules.mockRejectedValue(new Error('toggle failed'));
    const { result } = renderHook(() => useToggleRuleEnabled(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1', enabled: true, name: 'My CPU Alert' });

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith(expect.any(String));
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });

  it('shows a danger toast when the bulk response reports a per-rule error', async () => {
    mockBulkEnableRules.mockResolvedValue({
      affected_count: 0,
      errors: [{ id: 'rule-1', error: { code: 'RULE_NOT_FOUND', message: 'not found' } }],
    } satisfies BulkResponse);
    const { result } = renderHook(() => useToggleRuleEnabled(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1', enabled: true, name: 'My CPU Alert' });

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith(expect.any(String));
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });

  it('stays in a loading state until the invalidated queries have refetched', async () => {
    mockBulkEnableRules.mockResolvedValue(successResponse);
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

    result.current.mutate({ id: 'rule-1', enabled: true, name: 'My CPU Alert' });

    // The success toast fires synchronously before invalidation is awaited, so once
    // it has been called we know the mutation is now blocked on the invalidation promise.
    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalled());
    expect(result.current.isLoading).toBe(true);

    resolveInvalidate();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

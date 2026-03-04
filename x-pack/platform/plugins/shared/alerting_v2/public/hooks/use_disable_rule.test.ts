/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useDisableRule } from './use_disable_rule';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';

jest.mock('@kbn/core-di-browser');
jest.mock('../services/rules_api');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

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

describe('useDisableRule', () => {
  const mockDisableRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { disableRule: mockDisableRule } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } } as any;
      }
      return undefined as any;
    });
  });

  it('should disable a rule, show a success toast, and invalidate the query cache', async () => {
    mockDisableRule.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDisableRule(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1' });

    await waitFor(() => {
      expect(mockDisableRule).toHaveBeenCalledWith('rule-1');
      expect(mockAddSuccess).toHaveBeenCalledWith({ title: expect.any(String) });
      expect(mockAddError).not.toHaveBeenCalled();
    });
  });

  it('should show an error toast when disabling fails', async () => {
    const error = new Error('disable failed');
    mockDisableRule.mockRejectedValue(error);
    const { result } = renderHook(() => useDisableRule(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1' });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(error, { title: expect.any(String) });
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });

  it('should pass the correct rule id through to the API', async () => {
    mockDisableRule.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDisableRule(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'custom-id-123' });

    await waitFor(() => {
      expect(mockDisableRule).toHaveBeenCalledWith('custom-id-123');
    });
  });
});

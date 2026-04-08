/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useDeleteRule } from './use_delete_rule';
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

describe('useDeleteRule', () => {
  const mockDeleteRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { deleteRule: mockDeleteRule } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addDanger: mockAddDanger } } as any;
      }
      return undefined as any;
    });
  });

  it('should delete a rule and show a success toast', async () => {
    mockDeleteRule.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDeleteRule(), { wrapper: createWrapper() });

    result.current.mutate('rule-1');

    await waitFor(() => {
      expect(mockDeleteRule).toHaveBeenCalledWith('rule-1');
      expect(mockAddSuccess).toHaveBeenCalledWith(expect.any(String));
      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });

  it('should show a danger toast when deletion fails', async () => {
    mockDeleteRule.mockRejectedValue(new Error('delete failed'));
    const { result } = renderHook(() => useDeleteRule(), { wrapper: createWrapper() });

    result.current.mutate('rule-1');

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith(expect.any(String));
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });

  it('should invoke per-call onSuccess callback after deletion', async () => {
    mockDeleteRule.mockResolvedValue(undefined);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteRule(), { wrapper: createWrapper() });

    result.current.mutate('rule-1', { onSuccess });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(mockAddSuccess).toHaveBeenCalled();
    });
  });

  it('should not invoke per-call onSuccess when deletion fails', async () => {
    mockDeleteRule.mockRejectedValue(new Error('delete failed'));
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useDeleteRule(), { wrapper: createWrapper() });

    result.current.mutate('rule-1', { onSuccess });

    await waitFor(() => {
      expect(onSuccess).not.toHaveBeenCalled();
      expect(mockAddDanger).toHaveBeenCalled();
    });
  });
});

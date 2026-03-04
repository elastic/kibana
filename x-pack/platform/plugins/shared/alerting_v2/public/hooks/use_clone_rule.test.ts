/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useCloneRule } from './use_clone_rule';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi, type RuleApiResponse } from '../services/rules_api';

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

describe('useCloneRule', () => {
  const mockCreateRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();

  const mockRule = {
    id: 'rule-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-02',
    metadata: { name: 'Test Rule' },
  } as unknown as RuleApiResponse;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { createRule: mockCreateRule } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } } as any;
      }
      return undefined as any;
    });
  });

  it('should clone a rule successfully and show a success toast', async () => {
    mockCreateRule.mockResolvedValue({});
    const { result } = renderHook(() => useCloneRule(), { wrapper: createWrapper() });

    result.current.mutate(mockRule);

    await waitFor(() => {
      expect(mockCreateRule).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ name: 'Test Rule (Clone)' }),
        })
      );
      expect(mockAddSuccess).toHaveBeenCalledWith({ title: expect.any(String) });
      expect(mockAddError).not.toHaveBeenCalled();
    });
  });

  it('should show an error toast when cloning fails', async () => {
    const error = new Error('clone failed');
    mockCreateRule.mockRejectedValue(error);
    const { result } = renderHook(() => useCloneRule(), { wrapper: createWrapper() });

    result.current.mutate(mockRule);

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(error, { title: expect.any(String) });
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });

  it('should strip id, createdAt, and updatedAt from the cloned payload', async () => {
    const ruleWithExtra = {
      id: 'rule-2',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      enabled: true,
      metadata: { name: 'Original', owner: 'me' },
    } as unknown as RuleApiResponse;
    mockCreateRule.mockResolvedValue({});
    const { result } = renderHook(() => useCloneRule(), { wrapper: createWrapper() });

    result.current.mutate(ruleWithExtra);

    await waitFor(() => {
      const payload = mockCreateRule.mock.calls[0][0];
      expect(payload.id).toBeUndefined();
      expect(payload.createdAt).toBeUndefined();
      expect(payload.updatedAt).toBeUndefined();
      expect(payload.enabled).toBe(true);
      expect(payload.metadata.owner).toBe('me');
      expect(payload.metadata.name).toBe('Original (Clone)');
    });
  });
});

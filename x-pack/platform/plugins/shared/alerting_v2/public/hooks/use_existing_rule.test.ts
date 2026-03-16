/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useExistingRule } from './use_existing_rule';
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

describe('useExistingRule', () => {
  const mockGetRule = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { getRule: mockGetRule } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addError: mockAddError } } as any;
      }
      return undefined as any;
    });
  });

  it('should return rule data on success', async () => {
    const mockRuleData = { id: 'rule-1', metadata: { name: 'Test' } };
    mockGetRule.mockResolvedValue(mockRuleData);

    const { result } = renderHook(() => useExistingRule('rule-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.rule).toEqual(mockRuleData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('should return loading state while fetching', () => {
    mockGetRule.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useExistingRule('rule-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.rule).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it('should call getRule with the correct rule id', async () => {
    mockGetRule.mockResolvedValue({ id: 'rule-1' });

    renderHook(() => useExistingRule('rule-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGetRule).toHaveBeenCalledWith('rule-1');
    });
  });

  it('should not fetch when ruleId is empty', () => {
    renderHook(() => useExistingRule(''), {
      wrapper: createWrapper(),
    });

    expect(mockGetRule).not.toHaveBeenCalled();
  });

  it('should show an error toast when the query fails', async () => {
    const error = new Error('load failed');
    mockGetRule.mockRejectedValue(error);

    renderHook(() => useExistingRule('rule-1'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(error, { title: expect.any(String) });
    });
  });
});

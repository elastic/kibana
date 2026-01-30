/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRuleTemplate } from './use_rule_template';
import { loadRuleTemplate } from '../apis/create_rule_from_template';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';

// Mocks
jest.mock('../apis/create_rule_from_template', () => ({
  loadRuleTemplate: jest.fn(),
}));

const queryClient = new QueryClient({
  logger: {
    error: () => {},
  } as any,
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useRuleTemplate', () => {
  const mockHttp = {} as HttpStart;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('should not fetch if not templateId is defined', async () => {
    const { result } = renderHook(() => useRuleTemplate({ http: mockHttp }), { wrapper });
    expect(loadRuleTemplate).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should not fetch if not templateId is string undefined', async () => {
    const { result } = renderHook(
      () => useRuleTemplate({ http: mockHttp, templateId: 'undefined' }),
      { wrapper }
    );

    expect(loadRuleTemplate).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch and return data when enabled and templateId is provided', async () => {
    (loadRuleTemplate as jest.Mock).mockResolvedValue({ id: 'test-id', name: 'Test Template' });
    const { result } = renderHook(
      () => useRuleTemplate({ http: mockHttp, templateId: 'test-id' }),
      { wrapper }
    );

    await waitFor(async () => {
      expect(loadRuleTemplate).toHaveBeenCalledWith({ http: mockHttp, templateId: 'test-id' });
      expect(result.current.data).toEqual({ id: 'test-id', name: 'Test Template' });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should handle API error', async () => {
    jest.mocked(loadRuleTemplate).mockImplementation(async () => {
      throw new Error('API Error');
    });
    const { result } = renderHook(
      () => useRuleTemplate({ http: mockHttp, templateId: 'test-id' }),
      { wrapper }
    );

    await waitFor(async () => {
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error)?.message).toMatch(/API Error/);
      expect(result.current.data).toBeUndefined();
    });
  });

  it('should set isLoading while fetching', async () => {
    let resolveFn: (value: any) => void;
    (loadRuleTemplate as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        })
    );
    const { result } = renderHook(
      () => useRuleTemplate({ http: mockHttp, templateId: 'test-id' }),
      { wrapper }
    );

    expect(result.current.isLoading).toBe(true);
    act(() => {
      resolveFn!({ id: 'test-id', name: 'Test Template' });
    });

    await waitFor(async () => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual({ id: 'test-id', name: 'Test Template' });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { waitFor, renderHook } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';

import { useResolveRule } from './use_resolve_rule';

const queryClient = new QueryClient();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

vi.mock('../apis/resolve_rule/resolve_rule', () => {
  const mocked = {
    resolveRule: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const { resolveRule } = await vi.importMock('../apis/resolve_rule/resolve_rule');

const httpMock = vi.fn();

describe('useResolveRule', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should call resolve rule API if ID is passed in', async () => {
    resolveRule.mockResolvedValueOnce({});
    const { result } = renderHook(
      () => {
        return useResolveRule({
          id: 'test-id',
          http: httpMock as unknown as HttpStart,
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toBeFalsy();
    });
    expect(result.current.data).not.toBeFalsy();
    expect(resolveRule).toHaveBeenCalled();
  });

  test('should not call resolve rule API if ID is not passed in', async () => {
    resolveRule.mockResolvedValueOnce({});
    const { result } = renderHook(
      () => {
        return useResolveRule({
          http: httpMock as unknown as HttpStart,
        });
      },
      { wrapper }
    );

    await waitFor(() => {
      return expect(result.current.isInitialLoading).toBeFalsy();
    });
    expect(result.current.data).toBeFalsy();
    expect(resolveRule).not.toHaveBeenCalled();
  });
});

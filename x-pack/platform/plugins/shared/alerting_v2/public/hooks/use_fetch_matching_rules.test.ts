/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';
import { toMatchRulesBody, useFetchMatchingRules } from './use_fetch_matching_rules';

jest.mock('@kbn/core-di-browser');

const mockUseService = jest.mocked(useService);
const mockCoreStart = jest.mocked(CoreStart);
const mockMatchRules = jest.fn();
const mockAddDanger = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useFetchMatchingRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart.mockImplementation(((key: string) => key) as unknown as typeof CoreStart);
    mockUseService.mockImplementation(((token: unknown) =>
      token === RulesApi
        ? { matchRules: mockMatchRules }
        : { toasts: { addDanger: mockAddDanger } }) as unknown as typeof useService);
  });

  it('fetches the rules matching the policy matcher', async () => {
    const response = { items: [], total: 0, page: 2, per_page: 10 };
    mockMatchRules.mockResolvedValue(response);

    const { result } = renderHook(
      () => useFetchMatchingRules({ matcher: { tags: ['cpu'] }, page: 2, perPage: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockMatchRules).toHaveBeenCalledWith({
      matcher: { tags: ['cpu'] },
      page: 2,
      per_page: 10,
    });
    expect(result.current.data).toEqual(response);
  });

  it('shows an error toast when the request fails', async () => {
    mockMatchRules.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(
      () => useFetchMatchingRules({ matcher: { tags: ['cpu'] }, page: 1, perPage: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockAddDanger).toHaveBeenCalledWith('Failed to load the rules matching this policy');
  });
});

describe('toMatchRulesBody', () => {
  it('maps camelCase params to the snake_case body', () => {
    expect(
      toMatchRulesBody({
        matcher: { tags: ['cpu'], expression: 'severity: critical' },
        page: 3,
        perPage: 50,
      })
    ).toEqual({
      matcher: { tags: ['cpu'], expression: 'severity: critical' },
      page: 3,
      per_page: 50,
    });
  });
});

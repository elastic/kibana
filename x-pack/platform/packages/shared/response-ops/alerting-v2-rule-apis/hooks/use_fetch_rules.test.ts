/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { FindRulesResponse } from '../types';
import { useFetchRules } from './use_fetch_rules';
import { createMockServices, createTestWrapper } from '../test_utils';

const mockResponse: FindRulesResponse = {
  items: [
    { id: 'rule-1', name: 'Test Rule 1', enabled: true },
    { id: 'rule-2', name: 'Test Rule 2', enabled: false },
  ] as FindRulesResponse['items'],
  total: 2,
  page: 1,
  perPage: 10,
};

describe('useFetchRules', () => {
  const services = createMockServices();

  beforeEach(() => jest.clearAllMocks());

  it('should fetch rules with pagination params', async () => {
    (services.http.get as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useFetchRules(services, { page: 1, perPage: 10 }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(services.http.get).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
      query: { page: 1, perPage: 10, search: undefined },
    });
    expect(result.current.data).toEqual(mockResponse);
  });

  it('should pass search param when provided', async () => {
    (services.http.get as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useFetchRules(services, { page: 1, perPage: 10, search: 'test query' }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(services.http.get).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
      query: { page: 1, perPage: 10, search: 'test query' },
    });
  });

  it('should show a danger toast when fetching fails', async () => {
    (services.http.get as jest.Mock).mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHook(() => useFetchRules(services, { page: 1, perPage: 10 }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(services.notifications.toasts.addDanger).toHaveBeenCalledWith(expect.any(String));
  });
});

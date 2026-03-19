/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useFetchRules } from './use_fetch_rules';
import { createMockServices, createTestWrapper } from './test_helpers';
import type { FindRulesResponse } from './rules_api';

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
  const mockServices = createMockServices();
  const mockHttp = mockServices.http as jest.Mocked<typeof mockServices.http>;
  const mockToasts = mockServices.notifications.toasts as jest.Mocked<
    typeof mockServices.notifications.toasts
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch rules with pagination params', async () => {
    (mockHttp.get as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useFetchRules({ page: 1, perPage: 10 }), {
      wrapper: createTestWrapper(mockServices),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockHttp.get).toHaveBeenCalledWith('/internal/alerting/v2/rule', {
      query: { page: 1, perPage: 10 },
    });
    expect(result.current.data).toEqual(mockResponse);
  });

  it('should show a danger toast when fetching fails', async () => {
    (mockHttp.get as jest.Mock).mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHook(() => useFetchRules({ page: 1, perPage: 10 }), {
      wrapper: createTestWrapper(mockServices),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockToasts.addDanger).toHaveBeenCalledWith(expect.any(String));
  });
});

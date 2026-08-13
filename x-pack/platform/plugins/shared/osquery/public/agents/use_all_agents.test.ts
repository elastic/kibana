/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import { useKibana } from '../common/lib/kibana';
import { useAllAgents } from './use_all_agents';
import { useOsqueryPolicies } from './use_osquery_policies';

jest.mock('../common/lib/kibana');
jest.mock('../common/hooks/use_error_toast', () => ({
  useErrorToast: () => jest.fn(),
}));
jest.mock('./use_osquery_policies', () => ({
  useOsqueryPolicies: jest.fn(),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useOsqueryPoliciesMock = useOsqueryPolicies as jest.MockedFunction<typeof useOsqueryPolicies>;

const generatePolicyIds = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `policy-${i.toString().padStart(8, '0')}`);

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

describe('useAllAgents', () => {
  const httpGet = jest.fn().mockResolvedValue({ agents: [], groups: {}, total: 0 });

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: { http: { get: httpGet } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('does NOT include policy_id: in the request kuery (regression guard — pre-fix: kuery contained policy ids)', async () => {
    useOsqueryPoliciesMock.mockReturnValue({
      data: ['policy-1', 'policy-2'],
      isFetched: true,
    } as unknown as ReturnType<typeof useOsqueryPolicies>);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useAllAgents(), { wrapper: createWrapper(queryClient) });
    await waitFor(() => expect(httpGet).toHaveBeenCalled());

    const [, { query }] = httpGet.mock.calls[0];
    expect(query.kuery).not.toMatch(/policy_id:/);
  });

  it('URL-budget regression: 300 policies produce a query string under 2048 chars with no policy_id clause', async () => {
    useOsqueryPoliciesMock.mockReturnValue({
      data: generatePolicyIds(300),
      isFetched: true,
    } as unknown as ReturnType<typeof useOsqueryPolicies>);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useAllAgents(), { wrapper: createWrapper(queryClient) });
    await waitFor(() => expect(httpGet).toHaveBeenCalled());

    const [, { query }] = httpGet.mock.calls[0];
    expect(query.kuery).not.toMatch(/policy_id:/);
    const queryStringLength = new URLSearchParams({ kuery: query.kuery ?? '' }).toString().length;
    expect(queryStringLength).toBeLessThan(2048);
  });

  it('scale-invariance: query string length is identical for 1 policy vs 300 policies with no search term', async () => {
    const runWith = async (policyIds: string[]) => {
      jest.clearAllMocks();
      useKibanaMock.mockReturnValue({
        services: { http: { get: httpGet } },
      } as unknown as ReturnType<typeof useKibana>);
      useOsqueryPoliciesMock.mockReturnValue({
        data: policyIds,
        isFetched: true,
      } as unknown as ReturnType<typeof useOsqueryPolicies>);
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      renderHook(() => useAllAgents(), { wrapper: createWrapper(queryClient) });
      await waitFor(() => expect(httpGet).toHaveBeenCalled());
      const [, { query }] = httpGet.mock.calls[0];

      return new URLSearchParams({ kuery: query.kuery ?? '' }).toString().length;
    };

    const lengthWith1 = await runWith(generatePolicyIds(1));
    const lengthWith300 = await runWith(generatePolicyIds(300));
    expect(lengthWith1).toBe(lengthWith300);
  });
});

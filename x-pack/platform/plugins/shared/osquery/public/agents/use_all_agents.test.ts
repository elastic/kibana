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
import { buildPolicyIdKuery } from '../../common/utils/build_policy_id_kuery';

jest.mock('../common/lib/kibana');
jest.mock('../common/hooks/use_error_toast', () => ({
  useErrorToast: () => jest.fn(),
}));
jest.mock('./use_osquery_policies', () => ({
  useOsqueryPolicies: jest.fn(),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useOsqueryPoliciesMock = useOsqueryPolicies as jest.MockedFunction<typeof useOsqueryPolicies>;

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

  it('escapes the search value so it cannot break out of the server policy scope', async () => {
    useOsqueryPoliciesMock.mockReturnValue({
      data: ['policy-1', 'policy-2'],
      isFetched: true,
    } as unknown as ReturnType<typeof useOsqueryPolicies>);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useAllAgents('a) or (b'), { wrapper: createWrapper(queryClient) });
    await waitFor(() => expect(httpGet).toHaveBeenCalled());

    const [, { query }] = httpGet.mock.calls[0];
    expect(query.kuery).not.toMatch(/[^\\]\)/);
    expect(query.kuery).toContain('a\\) \\or \\(b');
  });

  // Asserted on the builder rather than the hook so the test has a real subject — this
  // would have caught #277283, which doubled the per-policy cost.
  describe('buildPolicyIdKuery URL budget', () => {
    // Real Fleet policy ids are 36-char UUIDs; synthetic short ids understate the cost.
    const generateUuidPolicyIds = (count: number): string[] =>
      Array.from(
        { length: count },
        (_, i) =>
          `3c9a7e1${i.toString().padStart(2, '0')}-1a2b-4c3d-8e9f-${i.toString().padStart(12, '0')}`
      );

    it('exceeds the 16 KB header limit at 300 real-length policy ids — which is why it must not travel in the URL', () => {
      const kuery = buildPolicyIdKuery(generateUuidPolicyIds(300));
      expect(new URLSearchParams({ kuery }).toString().length).toBeGreaterThan(16 * 1024);
    });

    it('costs no more than ~200 chars per policy (guards against per-policy cost growth)', () => {
      const encodedLength = (count: number) =>
        new URLSearchParams({ kuery: buildPolicyIdKuery(generateUuidPolicyIds(count)) }).toString()
          .length;
      const marginalCost = (encodedLength(300) - encodedLength(100)) / 200;
      expect(marginalCost).toBeLessThan(200);
    });
  });
});

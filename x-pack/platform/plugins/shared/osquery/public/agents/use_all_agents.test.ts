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

jest.mock('../common/lib/kibana');
jest.mock('../common/hooks/use_error_toast', () => ({
  useErrorToast: () => jest.fn(),
}));
jest.mock('./use_osquery_policies', () => ({
  useOsqueryPolicies: () => ({ data: ['policy-1', 'policy-2'], isFetched: true }),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

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

  it('requests agents with a kuery matching base and version-suffixed policy ids', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useAllAgents(), { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(httpGet).toHaveBeenCalled());

    const [, { query }] = httpGet.mock.calls[0];
    expect(query.kuery).toBe('policy_id:("policy-1" or policy-1#* or "policy-2" or policy-2#*)');
  });
});

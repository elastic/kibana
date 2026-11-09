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
import { useAgentPolicyAgentIds } from './use_agent_policy_agent_ids';

jest.mock('../common/lib/kibana');
jest.mock('../common/hooks/use_error_toast', () => ({
  useErrorToast: () => jest.fn(),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

describe('useAgentPolicyAgentIds', () => {
  const httpGet = jest.fn().mockResolvedValue({ agents: [] });

  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: { http: { get: httpGet } },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('selects the agents on the policy, on its version specific policies and on its sentinel policy', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useAgentPolicyAgentIds({ agentPolicyId: 'policy-1' }), {
      wrapper: createWrapper(queryClient),
    });
    await waitFor(() => expect(httpGet).toHaveBeenCalled());

    const [, { query }] = httpGet.mock.calls[0];
    // by the base policy id, which the agents on `policy-1#9.4` and `policy-1#sentinel` have, with the
    // exact policy id for the agents that do not have it. No wildcard: it would also match `policy-1#123`.
    expect(query.kuery).toEqual(
      '(fleet-agents.policy_base_id:"policy-1" or (fleet-agents.policy_id:"policy-1" and not fleet-agents.policy_base_id:*))'
    );
  });
});

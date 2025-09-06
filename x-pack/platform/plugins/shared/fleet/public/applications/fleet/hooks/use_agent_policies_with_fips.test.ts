/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFleetTestRendererMock } from '../../../mock';

import { useGetAgentsQuery } from '../../../hooks';

import { useAgentPoliciesWithFipsAgents } from './use_agent_policies_with_fips';

jest.mock('../../../hooks', () => ({
  useGetAgentsQuery: jest.fn(),
}));

describe('useAgentPoliciesWithFipsAgents', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });
  const policy1Agents = [
    {
      active: true,
      status: 'online',
      local_metadata: { elastic: { agent: { version: '9.1.0', fips: true } } },
      id: '1',
      packages: [],
      type: 'PERMANENT',
      enrolled_at: new Date().toISOString(),
      policy_id: 'policy_1',
    },
    {
      active: true,
      status: 'online',
      local_metadata: { elastic: { agent: { version: '9.1.0', fips: false } } },
      id: '1',
      packages: [],
      type: 'PERMANENT',
      enrolled_at: new Date().toISOString(),
      policy_id: 'policy_1',
    },
  ];
  const policy2Agents = [
    {
      active: true,
      status: 'online',
      local_metadata: { elastic: { agent: { version: '9.1.0', fips: false } } },
      id: '1',
      packages: [],
      type: 'PERMANENT',
      enrolled_at: new Date().toISOString(),
      policy_id: 'policy_2',
    },
    {
      active: true,
      status: 'online',
      local_metadata: { elastic: { agent: { version: '8.17.0' } } },
      id: '1',
      packages: [],
      type: 'PERMANENT',
      enrolled_at: new Date().toISOString(),
      policy_id: 'policy_2',
    },
  ];

  it('Should return true if selected agent policies have agents running in Fips mode', () => {
    jest.mocked(useGetAgentsQuery).mockReturnValue({
      isLoading: false,
      data: { data: { items: policy1Agents } },
    } as any);
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useAgentPoliciesWithFipsAgents(['policy_1']));
    expect(result.current).toEqual(true);
  });

  it('Should return false if selected agent policies have no agents running in Fips mode', () => {
    jest.mocked(useGetAgentsQuery).mockReturnValue({
      isLoading: false,
      data: { data: { items: policy2Agents } },
    } as any);
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() => useAgentPoliciesWithFipsAgents(['policy_2']));
    expect(result.current).toEqual(false);
  });
});

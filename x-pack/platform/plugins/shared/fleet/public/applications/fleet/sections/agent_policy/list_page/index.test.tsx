/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent } from '@testing-library/react';
import { useQueryClient } from '@kbn/react-query';

import type { AgentPolicy, AgentPolicyPackagePoliciesSummary } from '../../../types';
import { createFleetTestRendererMock } from '../../../../../mock';
import {
  useAuthz,
  useAgentlessResources,
  useGetAgentPoliciesQuery,
  useGetAgentPoliciesPackagePoliciesSummaryQuery,
} from '../../../hooks';

import { AgentPolicyListPage } from '.';

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: jest.fn(),
}));

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  useAuthz: jest.fn(),
  useAgentlessResources: jest.fn(),
  useGetAgentPoliciesQuery: jest.fn(),
  useGetAgentPoliciesPackagePoliciesSummaryQuery: jest.fn(),
}));

const createAgentPolicy = (id: string): AgentPolicy => ({
  id,
  name: `policy ${id}`,
  namespace: 'default',
  status: 'active',
  is_managed: false,
  is_protected: false,
  revision: 1,
  updated_at: new Date().toISOString(),
  updated_by: 'test',
  agents: 0,
});

const summary: AgentPolicyPackagePoliciesSummary = {
  count: 4301,
  has_fleet_server: false,
  has_managed: false,
  has_root_integrations: false,
  has_shared: false,
};

describe('AgentPolicyListPage', () => {
  const refetch = jest.fn();
  const invalidateQueries = jest.fn();

  const mockSummaries = (
    value: Partial<ReturnType<typeof useGetAgentPoliciesPackagePoliciesSummaryQuery>>
  ) => {
    jest
      .mocked(useGetAgentPoliciesPackagePoliciesSummaryQuery)
      .mockReturnValue(value as ReturnType<typeof useGetAgentPoliciesPackagePoliciesSummaryQuery>);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuthz).mockReturnValue({
      fleet: { allAgentPolicies: true, addAgents: true, addFleetServers: true },
      integrations: { writeIntegrationPolicies: true },
    } as any);
    jest.mocked(useAgentlessResources).mockReturnValue({ showAgentless: true } as any);
    jest.mocked(useQueryClient).mockReturnValue({ invalidateQueries } as any);
    jest.mocked(useGetAgentPoliciesQuery).mockReturnValue({
      isLoading: false,
      data: { items: [createAgentPolicy('1'), createAgentPolicy('2')], total: 2 },
      refetch,
    } as any);
  });

  it('requests the agent policies without their package policies', () => {
    mockSummaries({ data: { items: { '1': summary } }, isLoading: false });

    createFleetTestRendererMock().render(<AgentPolicyListPage />);

    expect(useGetAgentPoliciesQuery).toHaveBeenCalledWith(
      expect.not.objectContaining({ full: true })
    );
    expect(useGetAgentPoliciesPackagePoliciesSummaryQuery).toHaveBeenCalledWith(['1', '2'], {
      enabled: true,
    });
  });

  it('shows the integrations count from the summary', () => {
    mockSummaries({ data: { items: { '1': summary } }, isLoading: false });

    const result = createFleetTestRendererMock().render(<AgentPolicyListPage />);

    expect(result.getByText('4301')).toBeInTheDocument();
  });

  it('keeps the row actions when the summary is not available', () => {
    mockSummaries({ data: undefined, isLoading: false });

    const result = createFleetTestRendererMock().render(<AgentPolicyListPage />);

    expect(result.getAllByTestId('agentActionsBtn')).toHaveLength(2);
    expect(result.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('reloads the summaries together with the agent policies', () => {
    mockSummaries({ data: { items: { '1': summary } }, isLoading: false });

    const result = createFleetTestRendererMock().render(<AgentPolicyListPage />);
    fireEvent.click(result.getByRole('button', { name: 'Reload' }));

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith(['agentPolicies', 'packagePoliciesSummary']);
  });
});

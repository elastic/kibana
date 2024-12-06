/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../../mock';

import { AgentBasedPackagePoliciesTable } from './agent_based_table';

const mockPackagePolicies = [
  {
    agentPolicies: [
      {
        id: '1',
        name: 'Agent Policy 1',
        status: 'active' as const,
        is_managed: false,
        is_protected: false,
        updated_at: '2023-01-01T00:00:00Z',
        updated_by: 'user',
        created_at: '2023-01-01T00:00:00Z',
        created_by: 'user',
        namespace: 'default',
        revision: 1,
        monitoring_enabled: [],
      },
    ],
    packagePolicy: {
      id: 'pkg1',
      name: 'Package Policy 1',
      package: { name: 'package-name', title: 'Package Title', version: '1.0.0' },
      hasUpgrade: true,
      inputs: [],
      revision: 1,
      updated_at: '2023-01-01T00:00:00Z',
      updated_by: 'user',
      created_at: '2023-01-01T00:00:00Z',
      created_by: 'user',
      namespace: 'default',
      policy_id: 'policy1',
      policy_ids: ['policy1'],
      enabled: true,
    },
    rowIndex: 0,
  },
];

const mockPagination = {
  pagination: { currentPage: 1, pageSize: 10, totalItemCount: 1, pageSizeOptions: [10, 20, 50] },
  setPagination: jest.fn(),
  pageSizeOptions: [10, 20, 50],
};

describe('AgentBasedPackagePoliciesTable', () => {
  it('renders the table with package policies', async () => {
    const renderer = createIntegrationsTestRendererMock();
    const result = renderer.render(
      <AgentBasedPackagePoliciesTable
        isLoading={false}
        packagePolicies={mockPackagePolicies}
        packagePoliciesTotal={1}
        refreshPackagePolicies={jest.fn()}
        pagination={mockPagination}
      />
    );
    await act(async () => {
      expect(result.getByText('Integration policy')).toBeInTheDocument();
      expect(result.getByText('Package Policy 1')).toBeInTheDocument();
      expect(result.getByText('v1.0.0')).toBeInTheDocument();
    });
  });

  it('shows loading message when isLoading is true', async () => {
    const renderer = createIntegrationsTestRendererMock();
    const result = renderer.render(
      <AgentBasedPackagePoliciesTable
        isLoading={true}
        packagePolicies={[]}
        packagePoliciesTotal={0}
        refreshPackagePolicies={jest.fn()}
        pagination={mockPagination}
      />
    );
    await act(async () => {
      expect(result.getByText('Loading integration policies…')).toBeInTheDocument();
    });
  });

  it('shows no policies message when there are no package policies', async () => {
    const renderer = createIntegrationsTestRendererMock();
    const result = renderer.render(
      <AgentBasedPackagePoliciesTable
        isLoading={false}
        packagePolicies={[]}
        packagePoliciesTotal={0}
        refreshPackagePolicies={jest.fn()}
        pagination={mockPagination}
      />
    );
    await act(async () => {
      expect(result.getByText('No integration policies')).toBeInTheDocument();
    });
  });

  it('opens the agent enrollment flyout when add agent button is clicked', async () => {
    const renderer = createIntegrationsTestRendererMock();
    const result = renderer.render(
      <AgentBasedPackagePoliciesTable
        isLoading={false}
        packagePolicies={mockPackagePolicies}
        packagePoliciesTotal={1}
        refreshPackagePolicies={jest.fn()}
        pagination={mockPagination}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Add agent'));
    });
    expect(result.getByTestId('agentEnrollmentFlyout')).toBeInTheDocument();
  });
});

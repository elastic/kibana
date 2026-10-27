/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, act, within } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { CloudOnboardingDeploymentListItem } from '../../../../../../../../common/types';

import { CollectionInstancesTable } from './collection_instances_table';

const mockNavigateToApp = jest.fn();

jest.mock('../../../../../../../hooks', () => {
  const originalModule = jest.requireActual('../../../../../../../hooks');
  return {
    ...originalModule,
    useStartServices: jest.fn(() => ({ application: { navigateToApp: mockNavigateToApp } })),
  };
});

const makeInstance = (
  overrides: Partial<CloudOnboardingDeploymentListItem> = {}
): CloudOnboardingDeploymentListItem => ({
  id: 'deployment-1',
  provider: 'aws',
  mechanisms: ['managed_integration', 'ecf'],
  integrationName: 'AWS-collection-1',
  services: ['cloudtrail', 'vpcflow', 'elb_logs'],
  serviceNames: {
    cloudtrail: 'AWS CloudTrail',
    vpcflow: 'AWS VPC Flow Logs',
    elb_logs: 'AWS ELB',
  },
  status: 'succeeded',
  attemptCount: 1,
  packageNames: ['aws', 'aws_bedrock'],
  updatedBy: 'elastic',
  updatedAt: '2026-10-20T10:00:00.000Z',
  packages: [
    { name: 'aws', title: 'AWS', version: '8.11.0' },
    { name: 'aws_bedrock', title: 'Amazon Bedrock', version: '1.2.0' },
  ],
  servicesByMethod: { managed_integration: ['cloudtrail', 'vpcflow'], ecf: ['elb_logs'] },
  agentCount: 5,
  ...overrides,
});

describe('CollectionInstancesTable', () => {
  const renderTable = (instances: CloudOnboardingDeploymentListItem[]) =>
    createIntegrationsTestRendererMock().render(<CollectionInstancesTable instances={instances} />);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one row per instance with its name, user and agents', () => {
    renderTable([makeInstance(), makeInstance({ id: 'deployment-2', integrationName: 'Two' })]);

    expect(screen.getAllByTestId('collectionInstancesTableRow')).toHaveLength(2);
    expect(screen.getByText('AWS-collection-1')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    expect(screen.getAllByText('elastic')).toHaveLength(2);
  });

  it('falls back to the deployment name, then the id, without an integration name', () => {
    renderTable([
      makeInstance({ integrationName: undefined, deploymentName: 'stack-name' }),
      makeInstance({ id: 'deployment-2', integrationName: undefined }),
    ]);

    expect(screen.getByText('stack-name')).toBeInTheDocument();
    expect(screen.getByText('deployment-2')).toBeInTheDocument();
  });

  it('shows a service count per deployment method', () => {
    renderTable([makeInstance()]);

    const row = screen.getByTestId('collectionInstancesTableRow');
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('1')).toBeInTheDocument();
  });

  it('shows the service titles by method in a tooltip', async () => {
    renderTable([makeInstance()]);

    const row = screen.getByTestId('collectionInstancesTableRow');
    await act(async () => {
      within(row).getByText('2').focus();
    });

    expect(
      await screen.findByText('Managed integration: AWS CloudTrail, AWS VPC Flow Logs')
    ).toBeInTheDocument();
  });

  it('shows the aws version for several packages, with every package version in a tooltip', async () => {
    renderTable([
      makeInstance({
        packages: [
          { name: 'aws_bedrock', title: 'Amazon Bedrock', version: '1.2.0' },
          { name: 'aws', title: 'AWS', version: '8.11.0' },
        ],
      }),
    ]);

    const row = screen.getByTestId('collectionInstancesTableRow');
    expect(within(row).getByText('8.11.0')).toBeInTheDocument();
    expect(within(row).queryByText('1.2.0')).not.toBeInTheDocument();

    await act(async () => {
      within(row).getByText('8.11.0').focus();
    });
    expect(await screen.findByText('Amazon Bedrock: 1.2.0, AWS: 8.11.0')).toBeInTheDocument();
  });

  it('shows the first package version for several packages without aws', () => {
    renderTable([
      makeInstance({
        packages: [
          { name: 'aws_bedrock', title: 'Amazon Bedrock', version: '1.2.0' },
          { name: 'aws_mq', title: 'Amazon MQ', version: '2.1.0' },
        ],
      }),
    ]);

    const row = screen.getByTestId('collectionInstancesTableRow');
    expect(within(row).getByText('1.2.0')).toBeInTheDocument();
    expect(within(row).queryByText('2.1.0')).not.toBeInTheDocument();
  });

  it('shows the version of a single package without a tooltip', () => {
    renderTable([
      makeInstance({ packages: [{ name: 'aws_mq', title: 'Amazon MQ', version: '2.1.0' }] }),
    ]);

    const row = screen.getByTestId('collectionInstancesTableRow');
    expect(within(row).getByText('2.1.0')).not.toHaveAttribute('tabindex');
  });

  it('names up to 3 services in a tooltip and elides the rest', async () => {
    renderTable([
      makeInstance({
        services: ['a', 'b', 'c', 'd'],
        serviceNames: { a: 'A', b: 'B', c: 'C', d: 'D' },
        servicesByMethod: { ecf: ['a', 'b', 'c', 'd'] },
      }),
    ]);

    const row = screen.getByTestId('collectionInstancesTableRow');
    await act(async () => {
      within(row).getByText('4').focus();
    });

    expect(await screen.findByText('Elastic Cloud Forwarder: A, B, C, ...')).toBeInTheDocument();
  });

  it('shows dashes where an instance has no policies, like an ECF-only instance', () => {
    renderTable([
      makeInstance({
        mechanisms: ['ecf'],
        packages: [],
        servicesByMethod: { ecf: ['elb_logs'] },
        agentCount: 0,
        updatedBy: undefined,
        updatedAt: undefined,
      }),
    ]);

    const row = screen.getByTestId('collectionInstancesTableRow');
    expect(within(row).getAllByText('-').length).toBeGreaterThanOrEqual(3);
  });

  it('opens the instance in the onboarding app without starting a new session', async () => {
    renderTable([makeInstance()]);

    await act(async () => {
      screen.getByTestId('collectionInstanceLink').click();
    });

    expect(mockNavigateToApp).toHaveBeenCalledWith('onboarding', {
      path: '/aws?deploymentId=deployment-1',
    });
  });
});

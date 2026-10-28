/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, act, within, waitFor } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { CloudOnboardingDeploymentListItem } from '../../../../../../../../common/types';

import { InstancesTable } from './instances_table';

const mockNavigateToApp = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

jest.mock('../../../../../../../hooks', () => {
  const originalModule = jest.requireActual('../../../../../../../hooks');
  return {
    ...originalModule,
    useStartServices: jest.fn(() => ({
      application: { navigateToApp: mockNavigateToApp },
      notifications: { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } },
    })),
    useAuthz: jest.fn(),
    sendDeleteCloudOnboardingDeployment: jest.fn(),
  };
});

import { sendDeleteCloudOnboardingDeployment, useAuthz } from '../../../../../../../hooks';

const mockUseAuthz = useAuthz as jest.Mock;
const mockSendDelete = sendDeleteCloudOnboardingDeployment as jest.Mock;

const authzWith = ({ allAgentPolicies = false, allIntegrations = false } = {}) => ({
  fleet: { allAgentPolicies },
  integrations: { all: allIntegrations },
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

describe('InstancesTable', () => {
  const renderTable = (instances: CloudOnboardingDeploymentListItem[], packageName = 'aws') =>
    createIntegrationsTestRendererMock().render(
      <InstancesTable instances={instances} packageName={packageName} />
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthz.mockReturnValue(authzWith({ allAgentPolicies: true }));
    mockSendDelete.mockResolvedValue({ id: 'deployment-1' });
  });

  it('renders one row per instance with its name, user and agents', () => {
    renderTable([makeInstance(), makeInstance({ id: 'deployment-2', integrationName: 'Two' })]);

    expect(screen.getAllByTestId('instancesTableRow')).toHaveLength(2);
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

    const row = screen.getByTestId('instancesTableRow');
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('1')).toBeInTheDocument();
  });

  it('shows the service titles by method in a tooltip', async () => {
    renderTable([makeInstance()]);

    const row = screen.getByTestId('instancesTableRow');
    await act(async () => {
      within(row).getByText('2').focus();
    });

    expect(
      await screen.findByText('Managed integration: AWS CloudTrail, AWS VPC Flow Logs')
    ).toBeInTheDocument();
  });

  it('shows the version of the package being viewed', () => {
    renderTable([makeInstance()], 'aws_bedrock');

    const row = screen.getByTestId('instancesTableRow');
    expect(within(row).getByText('1.2.0')).toBeInTheDocument();
    expect(within(row).queryByText('8.11.0')).not.toBeInTheDocument();
  });

  it('shows the version of another package of the instance when that one is viewed', () => {
    renderTable([makeInstance()], 'aws');

    const row = screen.getByTestId('instancesTableRow');
    expect(within(row).getByText('8.11.0')).toBeInTheDocument();
    expect(within(row).queryByText('1.2.0')).not.toBeInTheDocument();
  });

  it('shows a dash when the instance has no policy of the package being viewed', () => {
    renderTable([makeInstance({ packages: [] })], 'aws');

    const row = screen.getByTestId('instancesTableRow');
    expect(within(row).queryByText('8.11.0')).not.toBeInTheDocument();
    expect(within(row).getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });

  it.each([
    [4, 'Elastic Cloud Forwarder: A, B, C and 1 more service'],
    [6, 'Elastic Cloud Forwarder: A, B, C and 3 more services'],
  ])('names up to 3 of %i services in a tooltip and counts the rest', async (count, tooltip) => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'].slice(0, count);
    renderTable([
      makeInstance({
        services: ids,
        serviceNames: Object.fromEntries(ids.map((id) => [id, id.toUpperCase()])),
        servicesByMethod: { ecf: ids },
      }),
    ]);

    const row = screen.getByTestId('instancesTableRow');
    await act(async () => {
      within(row).getByText(String(count)).focus();
    });

    expect(await screen.findByText(tooltip)).toBeInTheDocument();
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

    const row = screen.getByTestId('instancesTableRow');
    expect(within(row).getAllByText('-').length).toBeGreaterThanOrEqual(3);
  });

  it('opens the instance in the onboarding app without starting a new session', async () => {
    renderTable([makeInstance()]);

    await act(async () => {
      screen.getByTestId('instanceLink').click();
    });

    expect(mockNavigateToApp).toHaveBeenCalledWith('onboarding', {
      path: '/aws?deploymentId=deployment-1',
    });
  });

  describe('delete action', () => {
    const openDeleteModal = async () => {
      await act(async () => {
        screen.getByTestId('deleteInstanceAction').click();
      });
      return screen.getByTestId('deleteInstanceModal');
    };

    it.each([
      ['agent policies', { allAgentPolicies: true }],
      ['integrations', { allIntegrations: true }],
    ])('is offered with write access to %s', (_, access) => {
      mockUseAuthz.mockReturnValue(authzWith(access));
      renderTable([makeInstance()]);

      expect(screen.getByTestId('deleteInstanceAction')).toBeInTheDocument();
    });

    it('is not offered without write access', () => {
      mockUseAuthz.mockReturnValue(authzWith());
      renderTable([makeInstance()]);

      expect(screen.queryByTestId('deleteInstanceAction')).not.toBeInTheDocument();
    });

    it('asks for confirmation and explains what is kept', async () => {
      renderTable([makeInstance()]);

      const modal = await openDeleteModal();

      expect(within(modal).getByText('Delete instance AWS-collection-1?')).toBeInTheDocument();
      expect(
        within(modal).getByText(/are not removed and keep collecting data/)
      ).toBeInTheDocument();
      expect(mockSendDelete).not.toHaveBeenCalled();
    });

    it('does nothing when cancelled', async () => {
      renderTable([makeInstance()]);
      const modal = await openDeleteModal();

      await act(async () => {
        within(modal).getByTestId('confirmModalCancelButton').click();
      });

      expect(screen.queryByTestId('deleteInstanceModal')).not.toBeInTheDocument();
      expect(mockSendDelete).not.toHaveBeenCalled();
    });

    it('deletes the instance on confirm and closes the modal', async () => {
      renderTable([makeInstance()]);
      const modal = await openDeleteModal();

      await act(async () => {
        within(modal).getByTestId('confirmModalConfirmButton').click();
      });

      expect(mockSendDelete).toHaveBeenCalledWith('deployment-1');
      expect(mockAddSuccess).toHaveBeenCalledWith('Deleted instance AWS-collection-1');
      await waitFor(() =>
        expect(screen.queryByTestId('deleteInstanceModal')).not.toBeInTheDocument()
      );
    });

    it('shows an error and keeps the modal open when the delete fails', async () => {
      const error = new Error('boom');
      mockSendDelete.mockRejectedValue(error);
      renderTable([makeInstance()]);
      const modal = await openDeleteModal();

      await act(async () => {
        within(modal).getByTestId('confirmModalConfirmButton').click();
      });

      expect(mockAddError).toHaveBeenCalledWith(error, {
        title: 'Could not delete instance AWS-collection-1',
      });
      expect(screen.getByTestId('deleteInstanceModal')).toBeInTheDocument();
    });
  });
});

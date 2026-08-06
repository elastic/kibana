/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { waitFor } from '@testing-library/react';

import { useGetAgentsQuery, useGetPackageInfoByKeyQuery, useFleetStatus } from '../../hooks';
import { usePollingIncomingData } from '../agent_enrollment_flyout/use_get_agent_incoming_data';
import { createIntegrationsTestRendererMock } from '../../mock';
import { KibanaSavedObjectType } from '../../../common/types/models';

import { AGENTS_PREFIX, FLEET_CONNECTORS_PACKAGE } from '../../constants';

import { AgentlessEnrollmentFlyout } from '.';

jest.mock('../../hooks', () => ({
  ...jest.requireActual('../../hooks'),
  useGetPackageInfoByKeyQuery: jest.fn(),
  useGetAgentsQuery: jest.fn(),
  useFleetStatus: jest.fn(),
}));

jest.mock('../agent_enrollment_flyout/use_get_agent_incoming_data', () => ({
  usePollingIncomingData: jest.fn(),
}));

const mockUseGetAgentsQuery = useGetAgentsQuery as jest.Mock;
const mockUseGetPackageInfoByKeyQuery = useGetPackageInfoByKeyQuery as jest.Mock;
const mockUsePollingIncomingData = usePollingIncomingData as jest.Mock;
const mockUseFleetStatus = useFleetStatus as jest.Mock;

const makeDashboardInstallation = (count: number) => ({
  installed_kibana_space_id: 'default',
  installed_kibana: Array.from({ length: count }, (_, i) => ({
    id: `dash-${i}`,
    type: KibanaSavedObjectType.dashboard,
  })),
});

describe('AgentlessEnrollmentFlyout', () => {
  const onClose = jest.fn();
  const baseProps = {
    onClose,
    policyId: 'test-policy-id',
    policyName: 'test-package-policy',
    packageInfo: { name: 'test-package', version: '1.0.0' },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1 — Confirm managed integration enrollment', () => {
    beforeEach(() => {
      mockUseFleetStatus.mockReturnValue({ spaceId: 'default' });
      mockUseGetPackageInfoByKeyQuery.mockReturnValue({
        data: { item: { title: 'Test Package' } },
      });
      mockUsePollingIncomingData.mockReturnValue({ incomingData: [], hasReachedTimeout: false });
    });

    it('renders the flyout with initial loading state', async () => {
      mockUseGetAgentsQuery.mockReturnValue({ data: { data: { items: [] } } });

      const renderer = createIntegrationsTestRendererMock();
      const { getByText } = renderer.render(<AgentlessEnrollmentFlyout {...baseProps} />);

      await waitFor(async () => {
        expect(getByText('Confirm managed integration enrollment')).toBeInTheDocument();
        expect(getByText('Step 1 is loading')).toBeInTheDocument();
        expect(
          getByText(
            'Listening for managed integration connection... this could take several minutes'
          )
        ).toBeInTheDocument();
        expect(getByText('Confirm incoming data')).toBeInTheDocument();
        expect(getByText('Step 2 is disabled')).toBeInTheDocument();
      });
    });

    it('updates step statuses when agent deployment fails', async () => {
      mockUseGetAgentsQuery.mockReturnValue({ data: { data: { items: [{ status: 'error' }] } } });

      const renderer = createIntegrationsTestRendererMock();
      const { getByText } = renderer.render(<AgentlessEnrollmentFlyout {...baseProps} />);

      await waitFor(() => {
        expect(getByText('Confirm managed integration enrollment')).toBeInTheDocument();
        expect(getByText('Step 1 has errors')).toBeInTheDocument();
        expect(getByText('Managed integration deployment failed')).toBeInTheDocument();
        expect(getByText('Confirm incoming data')).toBeInTheDocument();
        expect(getByText('Step 2 is disabled')).toBeInTheDocument();
      });
    });

    it('sets step 1 complete and step 2 loading when agent is online', async () => {
      mockUseGetAgentsQuery.mockReturnValue({
        data: { data: { items: [{ status: 'online' }] } },
      });

      const renderer = createIntegrationsTestRendererMock();
      const { getByText } = renderer.render(<AgentlessEnrollmentFlyout {...baseProps} />);

      await waitFor(() => {
        expect(mockUseGetAgentsQuery).toHaveBeenCalledWith(
          { kuery: `${AGENTS_PREFIX}.policy_id: "test-policy-id"` },
          expect.objectContaining({ refetchInterval: expect.any(Number) })
        );
        expect(getByText('Confirm managed integration enrollment')).toBeInTheDocument();
        expect(getByText('Step 1 is complete')).toBeInTheDocument();
        expect(getByText('Managed integration deployment was successful')).toBeInTheDocument();
        expect(getByText('Confirm incoming data')).toBeInTheDocument();
        expect(getByText('Step 2 is loading')).toBeInTheDocument();
      });
    });

    it('does not reset completed steps when a subsequent poll returns no data', async () => {
      // First render with agent online, then simulate a failed refetch returning no items
      mockUseGetAgentsQuery
        .mockReturnValueOnce({ data: { data: { items: [{ status: 'online' }] } } })
        .mockReturnValue({ data: { data: { items: [] } } });

      const renderer = createIntegrationsTestRendererMock();
      const { getByText, rerender } = renderer.render(<AgentlessEnrollmentFlyout {...baseProps} />);

      await waitFor(() => {
        expect(getByText('Step 1 is complete')).toBeInTheDocument();
      });

      // Simulate a re-render triggered by a refetch returning no agent (e.g. refetchOnWindowFocus)
      rerender(<AgentlessEnrollmentFlyout {...baseProps} />);

      await waitFor(() => {
        expect(getByText('Step 1 is complete')).toBeInTheDocument();
        expect(getByText('Step 2 is loading')).toBeInTheDocument();
      });
    });
  });

  describe('Step 2 — Confirm incoming data', () => {
    beforeEach(() => {
      mockUseFleetStatus.mockReturnValue({ spaceId: 'default' });
      mockUseGetPackageInfoByKeyQuery.mockReturnValue({
        data: { item: { title: 'Test Package' } },
      });
      mockUseGetAgentsQuery.mockReturnValue({
        data: { data: { items: [{ status: 'online' }] } },
      });
    });

    it('shows step 2 as failed when timeout has been reached', async () => {
      mockUsePollingIncomingData.mockReturnValue({ incomingData: [], hasReachedTimeout: true });

      const renderer = createIntegrationsTestRendererMock();
      const { getByText } = renderer.render(<AgentlessEnrollmentFlyout {...baseProps} />);

      await waitFor(() => {
        expect(getByText('Step 1 is complete')).toBeInTheDocument();
        expect(getByText('Confirm incoming data')).toBeInTheDocument();
        expect(getByText('Step 2 has errors')).toBeInTheDocument();
        expect(getByText('No incoming data received from managed integration')).toBeInTheDocument();
      });
    });

    it('shows step 2 as complete when incoming data is received', async () => {
      mockUsePollingIncomingData.mockReturnValue({ incomingData: [{ data: 'test-data' }] });

      const renderer = createIntegrationsTestRendererMock();
      const { getByText } = renderer.render(<AgentlessEnrollmentFlyout {...baseProps} />);

      await waitFor(() => {
        expect(getByText('Step 1 is complete')).toBeInTheDocument();
        expect(getByText('Confirm incoming data')).toBeInTheDocument();
        expect(getByText('Step 2 is complete')).toBeInTheDocument();
        expect(getByText('Incoming data received from managed integration')).toBeInTheDocument();
      });
    });
  });

  describe('Step 3 — View dashboards', () => {
    beforeEach(() => {
      mockUseFleetStatus.mockReturnValue({ spaceId: 'default' });
      mockUseGetAgentsQuery.mockReturnValue({
        data: { data: { items: [{ status: 'online' }] } },
      });
      mockUsePollingIncomingData.mockReturnValue({ incomingData: [{ data: 'some-data' }] });
    });

    it('renders the View dashboards step when the package has dashboards and data is confirmed', async () => {
      mockUseGetPackageInfoByKeyQuery.mockReturnValue({
        data: {
          item: {
            title: 'AWS',
            installationInfo: makeDashboardInstallation(3),
          },
        },
      });

      const renderer = createIntegrationsTestRendererMock();
      const { getByTestId } = renderer.render(<AgentlessEnrollmentFlyout {...baseProps} />);

      await waitFor(() => {
        expect(getByTestId('agentlessStepViewDashboardsLink')).toBeInTheDocument();
      });

      const link = getByTestId('agentlessStepViewDashboardsLink');
      expect(link.getAttribute('href')).toContain('/app/dashboards#/list');
      expect(link.getAttribute('href')).toContain('AWS');
    });

    it('does not render the View dashboards step when the package has no dashboards', async () => {
      mockUseGetPackageInfoByKeyQuery.mockReturnValue({
        data: {
          item: {
            title: 'Security Posture Management',
            installationInfo: makeDashboardInstallation(0),
          },
        },
      });

      const renderer = createIntegrationsTestRendererMock();
      const { queryByText, queryByTestId } = renderer.render(
        <AgentlessEnrollmentFlyout {...baseProps} />
      );

      await waitFor(() => {
        expect(queryByText('View dashboards')).not.toBeInTheDocument();
        expect(queryByTestId('agentlessStepViewDashboardsLink')).not.toBeInTheDocument();
      });
    });

    it('does not render the View dashboards step for connector packages', async () => {
      mockUseGetPackageInfoByKeyQuery.mockReturnValue({
        data: {
          item: {
            title: 'Elastic Connectors',
            installationInfo: makeDashboardInstallation(5),
          },
        },
      });

      const renderer = createIntegrationsTestRendererMock();
      const { queryByText, queryByTestId } = renderer.render(
        <AgentlessEnrollmentFlyout
          {...baseProps}
          packageInfo={{ name: FLEET_CONNECTORS_PACKAGE, version: '1.0.0' }}
        />
      );

      await waitFor(() => {
        expect(queryByText('View dashboards')).not.toBeInTheDocument();
        expect(queryByTestId('agentlessStepViewDashboardsLink')).not.toBeInTheDocument();
      });
    });

    it('does not render the View dashboards step until data is confirmed', async () => {
      mockUseGetPackageInfoByKeyQuery.mockReturnValue({
        data: {
          item: {
            title: 'AWS',
            installationInfo: makeDashboardInstallation(3),
          },
        },
      });
      mockUsePollingIncomingData.mockReturnValue({ incomingData: [], hasReachedTimeout: false });

      const renderer = createIntegrationsTestRendererMock();
      const { queryByTestId } = renderer.render(<AgentlessEnrollmentFlyout {...baseProps} />);

      await waitFor(() => {
        expect(queryByTestId('agentlessStepViewDashboardsLink')).not.toBeInTheDocument();
      });
    });
  });
});

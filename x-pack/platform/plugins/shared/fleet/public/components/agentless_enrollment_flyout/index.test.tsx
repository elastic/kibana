/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { waitFor } from '@testing-library/react';

import { useGetAgentsQuery, useGetPackageInfoByKeyQuery } from '../../hooks';
import { usePollingIncomingData } from '../agent_enrollment_flyout/use_get_agent_incoming_data';
import { createIntegrationsTestRendererMock } from '../../mock';
import { buildPolicyBaseIdWithFallbackKuery } from '../../../common/services';

import { AGENTS_PREFIX } from '../../constants';

import { AgentlessEnrollmentFlyout } from '.';

jest.mock('../../hooks', () => ({
  ...jest.requireActual('../../hooks'),
  useGetAgentsQuery: jest.fn(),
  useGetPackageInfoByKeyQuery: jest.fn(),
}));

jest.mock('../agent_enrollment_flyout/use_get_agent_incoming_data', () => ({
  usePollingIncomingData: jest.fn(),
}));

const mockUseGetAgentsQuery = useGetAgentsQuery as jest.Mock;
const mockUseGetPackageInfoByKeyQuery = useGetPackageInfoByKeyQuery as jest.Mock;
const mockUsePollingIncomingData = usePollingIncomingData as jest.Mock;

// FLAKY: https://github.com/elastic/kibana/issues/201738
describe.skip('AgentlessEnrollmentFlyout', () => {
  const onClose = jest.fn();
  const baseProps = {
    onClose,
    policyId: 'test-policy-id',
    policyName: 'test-package-policy',
    packageInfo: { name: 'test-package', version: '1.0.0' },
  };

  beforeEach(() => {
    mockUseGetAgentsQuery.mockReturnValue({ data: { data: { items: [] } } });
    mockUseGetPackageInfoByKeyQuery.mockReturnValue({ data: { item: { title: 'Test Package' } } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1 — Confirm managed integration enrollment', () => {
    beforeEach(() => {
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

    it('resolves enrollment when agent is enrolled via a version-specific policy variant', async () => {
      // Agents on version-specific policies carry a policy_id like "test-policy-id#9.2".
      // The kuery must use the fallback helper so these agents are matched.
      mockUseGetAgentsQuery.mockReturnValue({
        data: { data: { items: [{ status: 'online', policy_id: 'test-policy-id#9.2' }] } },
      });

      const renderer = createIntegrationsTestRendererMock();
      const { getByText } = renderer.render(<AgentlessEnrollmentFlyout {...baseProps} />);

      await waitFor(() => {
        expect(getByText('Step 1 is complete')).toBeInTheDocument();
        expect(getByText('Managed integration deployment was successful')).toBeInTheDocument();
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
          {
            kuery: buildPolicyBaseIdWithFallbackKuery(
              'test-policy-id',
              `${AGENTS_PREFIX}.policy_base_id`,
              `${AGENTS_PREFIX}.policy_id`
            ),
          },
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

  it('fetches agents data on mount and sets step statuses when agent deployment succeeds', async () => {
    mockUseGetAgentsQuery.mockReturnValue({ data: { data: { items: [{ status: 'online' }] } } });
    mockUsePollingIncomingData.mockReturnValue({ incomingData: [], hasReachedTimeout: false });
    const renderer = createIntegrationsTestRendererMock();

    const { getByText } = renderer.render(<AgentlessEnrollmentFlyout {...baseProps} />);

    await waitFor(() => {
      expect(mockUseGetAgentsQuery).toHaveBeenCalledWith(
        {
          kuery: buildPolicyBaseIdWithFallbackKuery(
            'test-policy-id',
            `${AGENTS_PREFIX}.policy_base_id`,
            `${AGENTS_PREFIX}.policy_id`
          ),
        },
        expect.objectContaining({ refetchInterval: expect.any(Number) })
      );
      expect(getByText('Confirm managed integration enrollment')).toBeInTheDocument();
      expect(getByText('Step 1 is complete')).toBeInTheDocument();
      expect(getByText('Managed integration deployment was successful')).toBeInTheDocument();
      expect(getByText('Confirm incoming data')).toBeInTheDocument();
      expect(getByText('Step 2 is loading')).toBeInTheDocument();
    });
  });

  it('shows confirm data step as failed when timeout has been reached', async () => {
    mockUseGetAgentsQuery.mockReturnValue({ data: { data: { items: [{ status: 'online' }] } } });
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

  it('shows confirm data step as successful when incoming data is received', async () => {
    mockUseGetAgentsQuery.mockReturnValue({ data: { data: { items: [{ status: 'online' }] } } });
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

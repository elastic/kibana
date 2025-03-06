/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { Agent, AgentPolicy } from '../../../../types';
import { useGetPackageInfoByKeyQuery } from '../../../../../../hooks/use_request/epm';

import { AgentDashboardLink } from './agent_dashboard_link';

const mockedUseGetPackageInfoByKeyQuery = useGetPackageInfoByKeyQuery as jest.MockedFunction<
  typeof useGetPackageInfoByKeyQuery
>;

jest.mock('../../../../../../hooks/use_fleet_status', () => ({
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
  useFleetStatus: jest.fn().mockReturnValue({ spaceId: 'default' }),
}));

jest.mock('../../../../../../hooks/use_request/epm');

jest.mock('../../../../../../hooks/use_locator', () => {
  return {
    useDashboardLocator: jest.fn().mockImplementation(() => {
      return {
        id: 'DASHBOARD_APP_LOCATOR',
        getRedirectUrl: jest.fn().mockReturnValue('app/dashboards#/view/elastic_agent-a0001'),
      };
    }),
  };
});

describe('AgentDashboardLink', () => {
  it('should enable the button if elastic_agent package is installed and policy has monitoring enabled', async () => {
    mockedUseGetPackageInfoByKeyQuery.mockReturnValue({
      isLoading: false,
      data: {
        item: {
          status: 'installed',
          installationInfo: {
            install_status: 'installed',
            installed_kibana_space_id: 'default',
          },
        },
      },
    } as ReturnType<typeof useGetPackageInfoByKeyQuery>);
    const testRenderer = createFleetTestRendererMock();

    const result = testRenderer.render(
      <AgentDashboardLink
        agent={
          {
            id: 'agent-id-123',
          } as unknown as Agent
        }
        agentPolicy={
          {
            monitoring_enabled: ['logs', 'metrics'],
          } as unknown as AgentPolicy
        }
      />
    );

    expect(result.queryByRole('link')).not.toBeNull();
    expect(result.getByRole('link').hasAttribute('href')).toBeTruthy();
  });

  it('should not enable the button if elastic_agent package is not installed and policy has monitoring enabled', async () => {
    mockedUseGetPackageInfoByKeyQuery.mockReturnValue({
      isLoading: false,
      data: {
        item: {
          status: 'not_installed',
        },
      },
    } as ReturnType<typeof useGetPackageInfoByKeyQuery>);
    const testRenderer = createFleetTestRendererMock();

    const result = testRenderer.render(
      <AgentDashboardLink
        agent={
          {
            id: 'agent-id-123',
          } as unknown as Agent
        }
        agentPolicy={
          {
            monitoring_enabled: ['logs', 'metrics'],
          } as unknown as AgentPolicy
        }
      />
    );

    expect(result.queryByRole('link')).toBeNull();
    expect(result.queryByRole('button')).not.toBeNull();
    expect(result.getByRole('button').hasAttribute('disabled')).toBeTruthy();
  });

  it('should link to the agent policy settings tab if logs and metrics are not enabled for that policy', async () => {
    mockedUseGetPackageInfoByKeyQuery.mockReturnValue({
      isLoading: false,
      data: {
        item: {
          status: 'installed',
        },
      },
    } as ReturnType<typeof useGetPackageInfoByKeyQuery>);
    const testRenderer = createFleetTestRendererMock();

    const result = testRenderer.render(
      <AgentDashboardLink
        agent={
          {
            id: 'agent-id-123',
          } as unknown as Agent
        }
        agentPolicy={
          {
            id: 'policy123',
            monitoring_enabled: [],
          } as unknown as AgentPolicy
        }
      />
    );

    const link = result.queryByRole('link');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/mock/app/fleet/policies/policy123/settings');
  });

  it('it should disable the button if the agent policy is managed', async () => {
    mockedUseGetPackageInfoByKeyQuery.mockReturnValue({
      isLoading: false,
      data: {
        item: {
          status: 'installed',
        },
      },
    } as ReturnType<typeof useGetPackageInfoByKeyQuery>);
    const testRenderer = createFleetTestRendererMock();

    const result = testRenderer.render(
      <AgentDashboardLink
        agent={
          {
            id: 'agent-id-123',
          } as unknown as Agent
        }
        agentPolicy={
          {
            monitoring_enabled: [],
            is_managed: true,
          } as unknown as AgentPolicy
        }
      />
    );

    expect(
      result.getByTestId('agentDetails.enableLogsAndMetricsButton').hasAttribute('disabled')
    ).toBeTruthy();
  });
});

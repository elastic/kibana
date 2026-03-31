/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import type { TestRenderer } from '../../../../../../mock';
import { createFleetTestRendererMock } from '../../../../../../mock';
import {
  sendCreateAgentPolicyForRq,
  sendGetEnrollmentAPIKeys,
  sendGetOneAgentPolicy,
  useGetFleetServerHosts,
  useFleetStatus,
} from '../../../../hooks';
import { usePollingAgentCount } from '../../../../components';

import { AddCollectorFlyout } from './add_collector_flyout';

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  sendGetOneAgentPolicy: jest.fn(),
  sendCreateAgentPolicyForRq: jest.fn(),
  sendGetEnrollmentAPIKeys: jest.fn(),
  useGetFleetServerHosts: jest.fn(),
  useFleetStatus: jest.fn(),
}));
jest.mock('../../../../components', () => ({
  AgentEnrollmentConfirmationStep: () => ({
    title: 'Confirm enrollment',
    children: <div>Confirmation</div>,
  }),
  usePollingAgentCount: jest.fn(),
}));

const mockedSendGetOneAgentPolicy = jest.mocked(sendGetOneAgentPolicy);
const mockedSendCreateAgentPolicyForRq = jest.mocked(sendCreateAgentPolicyForRq);
const mockedSendGetEnrollmentAPIKeys = jest.mocked(sendGetEnrollmentAPIKeys);
const mockedUseGetFleetServerHosts = jest.mocked(useGetFleetServerHosts);
const mockedUsePollingAgentCount = jest.mocked(usePollingAgentCount);
const mockedUseFleetStatus = jest.mocked(useFleetStatus);

describe('AddCollectorFlyout', () => {
  let renderer: TestRenderer;

  const renderFlyout = () =>
    renderer.render(<AddCollectorFlyout onClose={jest.fn()} onClickViewAgents={jest.fn()} />);

  beforeEach(() => {
    renderer = createFleetTestRendererMock();
    jest.clearAllMocks();

    mockedUseGetFleetServerHosts.mockReturnValue({
      data: {
        items: [
          {
            is_default: true,
            host_urls: ['https://fleet.example:8220'],
          },
        ],
      },
      isLoading: false,
      isError: false,
      resendRequest: jest.fn(),
    } as any);

    mockedUsePollingAgentCount.mockReturnValue({
      enrolledAgentIds: [],
      total: 0,
    } as any);

    mockedUseFleetStatus.mockReturnValue({ spaceId: 'default' } as any);
  });

  it('uses existing OpAMP policy and renders generated configuration', async () => {
    mockedSendGetOneAgentPolicy.mockResolvedValue({
      data: { item: { id: 'opamp' } },
    } as any);
    mockedSendGetEnrollmentAPIKeys.mockResolvedValue({
      data: { items: [{ api_key: 'existing-token' }] },
    } as any);

    const component = renderFlyout();

    await waitFor(() => {
      expect(mockedSendGetOneAgentPolicy).toHaveBeenCalledWith('opamp');
      expect(mockedSendCreateAgentPolicyForRq).not.toHaveBeenCalled();
      expect(mockedSendGetEnrollmentAPIKeys).toHaveBeenCalledWith({
        page: 1,
        perPage: 1,
        kuery: 'policy_id:"opamp"',
      });
    });

    const configYaml = component.getByTestId('opampConfigYaml').textContent;
    expect(configYaml).toContain('Authorization: ApiKey existing-token');
    expect(configYaml).toContain('endpoint: https://fleet.example:8220/v1/opamp');
  });

  it('creates OpAMP policy when missing and then fetches enrollment token', async () => {
    mockedSendGetOneAgentPolicy.mockResolvedValue({
      error: { statusCode: 404 },
    } as any);
    mockedSendCreateAgentPolicyForRq.mockResolvedValue({
      item: { id: 'opamp' },
    } as any);
    mockedSendGetEnrollmentAPIKeys.mockResolvedValue({
      data: { items: [{ api_key: 'created-token' }] },
    } as any);

    const component = renderFlyout();

    await waitFor(() => {
      expect(mockedSendCreateAgentPolicyForRq).toHaveBeenCalledWith({
        name: 'OpAMP',
        id: 'opamp',
        namespace: 'default',
        description: 'Agent policy for OpAMP collectors',
        is_managed: true,
      });
    });

    const configYaml = component.getByTestId('opampConfigYaml').textContent;
    expect(configYaml).toContain('Authorization: ApiKey created-token');
  });

  it('uses space-prefixed policy ID when spaceId is non-default', async () => {
    mockedUseFleetStatus.mockReturnValue({ spaceId: 'my-space' } as any);

    mockedSendGetOneAgentPolicy.mockResolvedValue({
      data: { item: { id: 'my-space-opamp' } },
    } as any);
    mockedSendGetEnrollmentAPIKeys.mockResolvedValue({
      data: { items: [{ api_key: 'space-token' }] },
    } as any);

    const component = renderFlyout();

    await waitFor(() => {
      expect(mockedSendGetOneAgentPolicy).toHaveBeenCalledWith('my-space-opamp');
      expect(mockedSendGetEnrollmentAPIKeys).toHaveBeenCalledWith({
        page: 1,
        perPage: 1,
        kuery: 'policy_id:"my-space-opamp"',
      });
    });

    const configYaml = component.getByTestId('opampConfigYaml').textContent;
    expect(configYaml).toContain('Authorization: ApiKey space-token');
  });

  it('creates space-prefixed policy when missing in non-default space', async () => {
    mockedUseFleetStatus.mockReturnValue({ spaceId: 'my-space' } as any);

    mockedSendGetOneAgentPolicy.mockResolvedValue({
      error: { statusCode: 404 },
    } as any);
    mockedSendCreateAgentPolicyForRq.mockResolvedValue({
      item: { id: 'my-space-opamp' },
    } as any);
    mockedSendGetEnrollmentAPIKeys.mockResolvedValue({
      data: { items: [{ api_key: 'space-created-token' }] },
    } as any);

    const component = renderFlyout();

    await waitFor(() => {
      expect(mockedSendCreateAgentPolicyForRq).toHaveBeenCalledWith({
        name: 'OpAMP',
        id: 'my-space-opamp',
        namespace: 'default',
        description: 'Agent policy for OpAMP collectors',
        is_managed: true,
      });
    });

    const configYaml = component.getByTestId('opampConfigYaml').textContent;
    expect(configYaml).toContain('Authorization: ApiKey space-created-token');
  });

  it('renders a user-facing error when policy/token setup fails', async () => {
    mockedSendGetOneAgentPolicy.mockRejectedValue(new Error('setup failed'));

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <renderer.AppWrapper>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </renderer.AppWrapper>
    );

    const component = renderer.render(
      <AddCollectorFlyout onClose={jest.fn()} onClickViewAgents={jest.fn()} />,
      { wrapper }
    );

    await waitFor(() => {
      expect(component.getByText('setup failed')).toBeInTheDocument();
    });
  });
});

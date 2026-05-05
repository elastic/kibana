/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../mock';
import type { Agent } from '../../../types';
import { ExperimentalFeaturesService } from '../../../services';

jest.mock('../../../../../services/experimental_features');
jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  useGetOneAgent: jest.fn(),
  useGetOneAgentPolicy: jest.fn().mockReturnValue({
    isLoading: false,
    data: undefined,
    sendRequest: jest.fn(),
  }),
  useLink: jest.fn().mockReturnValue({
    getHref: jest.fn().mockReturnValue('#'),
    getPath: jest.fn().mockImplementation((page: string, values: any) => {
      if (page === 'agent_details') return `/agents/${values.agentId}`;
      return '#';
    }),
  }),
  useBreadcrumbs: jest.fn(),
  useStartServices: jest.fn().mockReturnValue({
    application: { navigateToApp: jest.fn() },
    notifications: { toasts: { addError: jest.fn() } },
  }),
  useIntraAppState: jest.fn(),
  sendGetAgentTagsForRq: jest.fn().mockResolvedValue({ items: [] }),
  useAgentlessResources: jest.fn().mockReturnValue({ showAgentless: true }),
  useGetInfoOutputsForPolicy: jest.fn().mockReturnValue({ data: undefined }),
}));
jest.mock('./components', () => ({
  AgentLogs: () => <div>{'AgentLogs'}</div>,
  AgentDetailsActionMenu: () => <div>{'AgentDetailsActionMenu'}</div>,
  AgentDetailsContent: () => <div>{'AgentDetailsContent'}</div>,
  AgentDiagnosticsTab: () => <div>{'AgentDiagnosticsTab'}</div>,
  AgentCollectorConfig: () => <div>{'AgentCollectorConfig'}</div>,
}));
jest.mock('./components/agent_settings', () => ({
  AgentSettings: () => <div>{'AgentSettings'}</div>,
}));

import { useGetOneAgent } from '../../../hooks';

import { AgentDetailsPage } from '.';

const mockedUseGetOneAgent = jest.mocked(useGetOneAgent);
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

const mockAgent = (overrides: Partial<Agent> = {}): Agent =>
  ({
    id: 'agent-1',
    type: 'PERMANENT',
    active: true,
    enrolled_at: '2023-01-01',
    status: 'online',
    local_metadata: { host: { hostname: 'test-host' } },
    user_provided_metadata: {},
    packages: [],
    policy_id: 'policy-1',
    tags: [],
    ...overrides,
  } as unknown as Agent);

describe('AgentDetailsPage', () => {
  const setupMocks = ({
    agent,
    enableOtelUI = false,
  }: {
    agent: Agent;
    enableOtelUI?: boolean;
  }) => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      enableOtelUI,
    } as any);

    mockedUseGetOneAgent.mockReturnValue({
      isLoading: false,
      isInitialRequest: false,
      error: undefined,
      data: { item: agent },
      resendRequest: jest.fn(),
    } as any);
  };

  const render = async () => {
    const renderer = createFleetTestRendererMock();
    renderer.mountHistory.push('/agents/agent-1');
    let result: ReturnType<typeof renderer.render>;
    await act(async () => {
      result = renderer.render(<AgentDetailsPage />);
    });
    return result!;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show collector config tab for OPAMP agent when enableOtelUI is true', async () => {
    setupMocks({ agent: mockAgent({ type: 'OPAMP' }), enableOtelUI: true });
    const { container } = await render();
    expect(container.querySelector('#collector-config')).not.toBeNull();
  });

  it('should not show collector config tab for non-OPAMP agent', async () => {
    setupMocks({ agent: mockAgent({ type: 'PERMANENT' }), enableOtelUI: true });
    const { container } = await render();
    expect(container.querySelector('#collector-config')).toBeNull();
  });

  it('should not show collector config tab when enableOtelUI is false', async () => {
    setupMocks({ agent: mockAgent({ type: 'OPAMP' }), enableOtelUI: false });
    const { container } = await render();
    expect(container.querySelector('#collector-config')).toBeNull();
  });

  it('should redirect to agent details when navigating directly to collector-config for non-OPAMP agent', async () => {
    setupMocks({ agent: mockAgent({ type: 'PERMANENT' }), enableOtelUI: true });
    const renderer = createFleetTestRendererMock();
    renderer.mountHistory.push('/agents/agent-1/collector-config');

    await act(async () => {
      renderer.render(<AgentDetailsPage />);
    });
    expect(renderer.mountHistory.location.pathname).toBe('/agents/agent-1');
  });

  it('should not render collector-config route when enableOtelUI is false', async () => {
    setupMocks({ agent: mockAgent({ type: 'OPAMP' }), enableOtelUI: false });
    const renderer = createFleetTestRendererMock();
    renderer.mountHistory.push('/agents/agent-1/collector-config');
    let result: ReturnType<typeof renderer.render>;
    await act(async () => {
      result = renderer.render(<AgentDetailsPage />);
    });
    expect(result!.queryByText('AgentCollectorConfig')).toBeNull();
  });
});

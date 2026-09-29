/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { act } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../mock';
import type { Agent } from '../../../types';
import { ExperimentalFeaturesService } from '../../../services';

vi.mock('../../../../../services/experimental_features');
vi.mock('../../../hooks', async () => {
  const mocked = {
    ...(await vi.importActual('../../../hooks')),
    useGetOneAgent: vi.fn(),
    useGetOneAgentPolicy: vi.fn().mockReturnValue({
      isLoading: false,
      data: undefined,
      sendRequest: vi.fn(),
    }),
    useLink: vi.fn().mockReturnValue({
      getHref: vi.fn().mockReturnValue('#'),
      getPath: vi.fn().mockImplementation((page: string, values: any) => {
        if (page === 'agent_details') return `/agents/${values.agentId}`;
        return '#';
      }),
    }),
    useBreadcrumbs: vi.fn(),
    useStartServices: vi.fn().mockReturnValue({
      application: { navigateToApp: vi.fn() },
      notifications: { toasts: { addError: vi.fn() } },
    }),
    useIntraAppState: vi.fn(),
    sendGetAgentTagsForRq: vi.fn().mockResolvedValue({ items: [] }),
    useAgentlessResources: vi.fn().mockReturnValue({ showAgentless: true }),
    useGetInfoOutputsForPolicy: vi.fn().mockReturnValue({ data: undefined }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./components', () => {
  const mocked = {
    AgentLogs: () => <div>{'AgentLogs'}</div>,
    AgentDetailsActionMenu: () => <div>{'AgentDetailsActionMenu'}</div>,
    AgentDetailsContent: () => <div>{'AgentDetailsContent'}</div>,
    AgentDiagnosticsTab: () => <div>{'AgentDiagnosticsTab'}</div>,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./components/agent_settings', () => {
  const mocked = {
    AgentSettings: () => <div>{'AgentSettings'}</div>,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./components/collector_detail', () => {
  const mocked = {
    CollectorDetailsContent: () => <div>{'CollectorDetailsContent'}</div>,
  };
  return { ...mocked, default: mocked };
});

import { useGetOneAgent } from '../../../hooks';

import { AgentDetailsPage } from '.';

const mockedUseGetOneAgent = vi.mocked(useGetOneAgent);
const mockedExperimentalFeaturesService = vi.mocked(ExperimentalFeaturesService);

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
      resendRequest: vi.fn(),
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
    vi.clearAllMocks();
  });

  it('should render CollectorDetailsContent for OPAMP agent when enableOtelUI is true', async () => {
    setupMocks({ agent: mockAgent({ type: 'OPAMP' }), enableOtelUI: true });
    const result = await render();
    expect(result.queryByText('CollectorDetailsContent')).not.toBeNull();
    expect(result.queryByText('AgentDetailsContent')).toBeNull();
  });

  it('should not show Diagnostics tab for OPAMP collector', async () => {
    setupMocks({ agent: mockAgent({ type: 'OPAMP' }), enableOtelUI: true });
    const result = await render();
    expect(result.queryByText('Diagnostics')).toBeNull();
  });

  it('should show Diagnostics tab for non-collector agents', async () => {
    setupMocks({ agent: mockAgent({ type: 'PERMANENT' }), enableOtelUI: true });
    const result = await render();
    expect(result.queryByText('Diagnostics')).not.toBeNull();
  });

  it('should not show Settings tab for OPAMP collector', async () => {
    setupMocks({ agent: mockAgent({ type: 'OPAMP' }), enableOtelUI: true });
    const result = await render();
    expect(result.queryByText('Settings')).toBeNull();
  });

  it('should show Settings tab for non-collector agents', async () => {
    setupMocks({ agent: mockAgent({ type: 'PERMANENT' }), enableOtelUI: true });
    const result = await render();
    expect(result.queryByText('Settings')).not.toBeNull();
  });

  it('should render AgentDetailsContent for non-OPAMP agent', async () => {
    setupMocks({ agent: mockAgent({ type: 'PERMANENT' }), enableOtelUI: true });
    const result = await render();
    expect(result.queryByText('AgentDetailsContent')).not.toBeNull();
    expect(result.queryByText('CollectorDetailsContent')).toBeNull();
  });

  it('should render AgentDetailsContent for OPAMP agent when enableOtelUI is false', async () => {
    setupMocks({ agent: mockAgent({ type: 'OPAMP' }), enableOtelUI: false });
    const result = await render();
    expect(result.queryByText('AgentDetailsContent')).not.toBeNull();
    expect(result.queryByText('CollectorDetailsContent')).toBeNull();
  });
});

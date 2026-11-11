/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { act, fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';

import type { Agent } from '../../../../types';

import { sendPostAgentUnenroll, sendPostBulkAgentUnenroll } from '../../../../hooks';

import { AgentUnenrollAgentModal, AgentForceUnenrollModal } from '.';

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    sendPostAgentUnenroll: jest.fn().mockResolvedValue({}),
    sendPostBulkAgentUnenroll: jest.fn().mockResolvedValue({}),
  };
});

const mockSendPostAgentUnenroll = sendPostAgentUnenroll as jest.MockedFunction<
  typeof sendPostAgentUnenroll
>;
const mockSendPostBulkAgentUnenroll = sendPostBulkAgentUnenroll as jest.MockedFunction<
  typeof sendPostBulkAgentUnenroll
>;

const createAgent = (overrides: Partial<Agent> = {}): Agent =>
  ({
    id: 'agent-1',
    active: true,
    status: 'online',
    local_metadata: { host: { hostname: 'host-1' } },
    ...overrides,
  } as Agent);

const confirm = async (getByTestId: (id: string) => HTMLElement) => {
  await act(async () => {
    fireEvent.click(getByTestId('confirmModalConfirmButton'));
  });
};

describe('AgentUnenrollAgentModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should unenroll a single agent without revoking its API keys', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByTestId } = renderer.render(
      <AgentUnenrollAgentModal agents={[createAgent()]} agentCount={1} onClose={jest.fn()} />
    );

    await confirm(getByTestId);

    await waitFor(() => {
      expect(mockSendPostAgentUnenroll).toHaveBeenCalledWith('agent-1', { revoke: false });
    });
  });

  it('should unenroll multiple agents without revoking their API keys', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByTestId } = renderer.render(
      <AgentUnenrollAgentModal
        agents={[createAgent(), createAgent({ id: 'agent-2' })]}
        agentCount={2}
        onClose={jest.fn()}
      />
    );

    await confirm(getByTestId);

    await waitFor(() => {
      expect(mockSendPostBulkAgentUnenroll).toHaveBeenCalledWith(
        expect.objectContaining({ agents: ['agent-1', 'agent-2'], revoke: false })
      );
    });
  });

  it('should no longer offer a force unenroll checkbox', async () => {
    const renderer = createFleetTestRendererMock();
    const { queryByLabelText, container } = renderer.render(
      <AgentUnenrollAgentModal agents={[createAgent()]} agentCount={1} onClose={jest.fn()} />
    );

    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(queryByLabelText(/Remove agent immediately/)).toBeNull();
  });

  it('should point at force unenroll without performing it', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByText } = renderer.render(
      <AgentUnenrollAgentModal agents={[createAgent()]} agentCount={1} onClose={jest.fn()} />
    );

    expect(getByText(/use Force unenroll instead/)).toBeInTheDocument();
    expect(mockSendPostAgentUnenroll).not.toHaveBeenCalled();
  });

  it('should report how many of a bulk selection already have an unenroll pending', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByText } = renderer.render(
      <AgentUnenrollAgentModal
        agents={[
          createAgent({ unenrollment_started_at: '2026-11-02T14:02:00Z' }),
          createAgent({ id: 'agent-2' }),
        ]}
        agentCount={2}
        onClose={jest.fn()}
      />
    );

    expect(getByText(/1 of these agents already has an unenroll pending/)).toBeInTheDocument();
  });

  it('should keep the generic signpost for an online agent', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByText, queryByText } = renderer.render(
      <AgentUnenrollAgentModal agents={[createAgent()]} agentCount={1} onClose={jest.fn()} />
    );

    expect(getByText('The agent must acknowledge this request')).toBeInTheDocument();
    expect(queryByText('This agent appears to be offline')).toBeNull();
  });

  it.each(['offline', 'inactive'] as const)(
    'should warn that a single %s agent will not unenroll until it checks in',
    async (status) => {
      const renderer = createFleetTestRendererMock();
      const { getByText, queryByText } = renderer.render(
        <AgentUnenrollAgentModal
          agents={[createAgent({ status })]}
          agentCount={1}
          onClose={jest.fn()}
        />
      );

      expect(getByText('This agent appears to be offline')).toBeInTheDocument();
      expect(queryByText('The agent must acknowledge this request')).toBeNull();
    }
  );

  it('should report how many of a bulk selection are offline', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByText, queryByText } = renderer.render(
      <AgentUnenrollAgentModal
        agents={[
          createAgent({ status: 'offline' }),
          createAgent({ id: 'agent-2', status: 'inactive' }),
          createAgent({ id: 'agent-3' }),
        ]}
        agentCount={3}
        onClose={jest.fn()}
      />
    );

    expect(getByText(/2 of these agents appear to be offline/)).toBeInTheDocument();
    expect(getByText('Each agent must acknowledge this request')).toBeInTheDocument();
    expect(queryByText('This agent appears to be offline')).toBeNull();
  });

  it('should keep the generic text when agents are selected by query', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByText, queryByText } = renderer.render(
      <AgentUnenrollAgentModal agents="status:offline" agentCount={5} onClose={jest.fn()} />
    );

    expect(getByText('Each agent must acknowledge this request')).toBeInTheDocument();
    expect(queryByText(/of these agents appear to be offline/)).toBeNull();
  });

  it.each([
    ['an online agent', [createAgent()], 1],
    ['an offline agent', [createAgent({ status: 'offline' })], 1],
    ['a bulk selection', [createAgent(), createAgent({ id: 'agent-2' })], 2],
  ])('should link to the unenroll documentation for %s', async (_, agents, agentCount) => {
    const renderer = createFleetTestRendererMock();
    const { getByText } = renderer.render(
      <AgentUnenrollAgentModal agents={agents} agentCount={agentCount} onClose={jest.fn()} />
    );

    expect(getByText('Learn more').closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('reference/fleet/unenroll-elastic-agent')
    );
  });

  it('should warn when unenrolling a Fleet Server agent', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByText } = renderer.render(
      <AgentUnenrollAgentModal
        agents={[createAgent()]}
        agentCount={1}
        hasFleetServer={true}
        onClose={jest.fn()}
      />
    );

    expect(getByText('This agent is running Fleet Server')).toBeInTheDocument();
  });
});

describe('AgentForceUnenrollModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should force unenroll a single agent by revoking its API keys', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByTestId } = renderer.render(
      <AgentForceUnenrollModal agents={[createAgent()]} agentCount={1} onClose={jest.fn()} />
    );

    await confirm(getByTestId);

    await waitFor(() => {
      expect(mockSendPostAgentUnenroll).toHaveBeenCalledWith('agent-1', { revoke: true });
    });
  });

  it('should force unenroll multiple agents by revoking their API keys', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByTestId } = renderer.render(
      <AgentForceUnenrollModal
        agents={[createAgent(), createAgent({ id: 'agent-2' })]}
        agentCount={2}
        onClose={jest.fn()}
      />
    );

    await confirm(getByTestId);

    await waitFor(() => {
      expect(mockSendPostBulkAgentUnenroll).toHaveBeenCalledWith(
        expect.objectContaining({ agents: ['agent-1', 'agent-2'], revoke: true })
      );
    });
  });

  it('should always state when to use this and what it does', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByText } = renderer.render(
      <AgentForceUnenrollModal agents={[createAgent()]} agentCount={1} onClose={jest.fn()} />
    );

    expect(getByText('This action does not notify the agent of unenrollment')).toBeInTheDocument();
    expect(getByText(/stuck offline or in a compromised state/)).toBeInTheDocument();
    expect(getByText(/Revokes the agent's local API keys and marks it/)).toBeInTheDocument();
  });

  it('should link to the unenroll documentation', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByText } = renderer.render(
      <AgentForceUnenrollModal agents={[createAgent()]} agentCount={1} onClose={jest.fn()} />
    );

    expect(getByText('Learn more').closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('reference/fleet/unenroll-elastic-agent')
    );
  });

  it('should carry the same warnings for a bulk selection', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByText } = renderer.render(
      <AgentForceUnenrollModal
        agents={[createAgent(), createAgent({ id: 'agent-2' })]}
        agentCount={2}
        onClose={jest.fn()}
      />
    );

    expect(getByText('This action does not notify the agents of unenrollment')).toBeInTheDocument();
    expect(getByText(/Revokes the agents' local API keys and marks them/)).toBeInTheDocument();
  });

  it('should warn when force unenrolling a Fleet Server agent', async () => {
    const renderer = createFleetTestRendererMock();
    const { getByText } = renderer.render(
      <AgentForceUnenrollModal
        agents={[createAgent()]}
        agentCount={1}
        hasFleetServer={true}
        onClose={jest.fn()}
      />
    );

    expect(getByText('This agent is running Fleet Server')).toBeInTheDocument();
  });
});

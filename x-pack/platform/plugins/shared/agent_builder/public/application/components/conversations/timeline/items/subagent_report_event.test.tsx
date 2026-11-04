/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EventActorType } from '@kbn/agent-builder-common';
import { createUserMessageEvent } from './user_message_event.factory';
import { SubagentReportEvent } from './subagent_report_event';
import { useAgentBuilderAgentById } from '../../../../hooks/agents/use_agent_by_id';

jest.mock('../../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: jest.fn(),
}));
jest.mock('../user_message/user_message_text', () => ({
  UserMessageText: ({ text }: { text: string }) => <div>{text}</div>,
}));
jest.mock('../../../common/agent_avatar', () => ({
  AgentAvatar: () => <div data-test-subj="agentAvatar" />,
}));

const mockUseAgentById = jest.mocked(useAgentBuilderAgentById);

describe('SubagentReportEvent', () => {
  const event = createUserMessageEvent({
    actor: { type: EventActorType.agent, id: 'child-agent', username: 'child-agent' },
    data: { message: 'Background sub-agent execution child-1 finished.\n\nResult:\nAPPLE' },
  });

  it('names the agent and shows the report', () => {
    mockUseAgentById.mockReturnValue({
      agent: { id: 'child-agent', name: 'Researcher' },
      isLoading: false,
      error: null,
    } as never);

    render(<SubagentReportEvent event={event} />);

    expect(screen.getByText('Researcher')).toBeInTheDocument();
    expect(screen.getByText('Sub-agent report')).toBeInTheDocument();
    expect(screen.getByText(/APPLE/)).toBeInTheDocument();
    expect(screen.getByTestId('agentAvatar')).toBeInTheDocument();
  });

  it('falls back to the agent id while the agent is unknown', () => {
    mockUseAgentById.mockReturnValue({ agent: null, isLoading: false, error: null } as never);

    render(<SubagentReportEvent event={event} />);

    expect(screen.getByText('child-agent')).toBeInTheDocument();
    expect(screen.queryByTestId('agentAvatar')).not.toBeInTheDocument();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createAgentMessageEvent } from './agent_message_event.factory';
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

const renderReport = (event: Parameters<typeof SubagentReportEvent>[0]['event']) =>
  render(
    <I18nProvider>
      <SubagentReportEvent event={event} />
    </I18nProvider>
  );

describe('SubagentReportEvent', () => {
  const event = createAgentMessageEvent();

  it('is one line naming the agent, with the report behind a click', () => {
    mockUseAgentById.mockReturnValue({
      agent: { id: 'child-agent', name: 'Researcher' },
      isLoading: false,
      error: null,
    } as never);

    renderReport(event);

    expect(screen.getByRole('status')).toHaveTextContent('Background agent finished · Researcher');
    expect(screen.getByTestId('agentAvatar')).toBeInTheDocument();
    expect(screen.queryByText(/APPLE/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText(/APPLE/)).toBeInTheDocument();
  });

  it('leaves the name out while the agent is unknown', () => {
    mockUseAgentById.mockReturnValue({ agent: null, isLoading: false, error: null } as never);

    renderReport(event);

    expect(screen.getByRole('status')).toHaveTextContent(/^Background agent finished$/);
    expect(screen.queryByTestId('agentAvatar')).not.toBeInTheDocument();
  });
});

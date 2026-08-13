/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ConversationsPopoverView } from './conversations_popover_view';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useStreamingContext } from '../../../context/streaming/streaming_context';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useAgentId } from '../../../hooks/use_conversation';

jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

jest.mock('../../../context/streaming/streaming_context', () => ({
  useStreamingContext: jest.fn(),
}));

jest.mock('../../../hooks/agents/use_agents', () => ({
  useAgentBuilderAgents: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation', () => ({
  useAgentId: jest.fn(),
}));

// Stub child: EmbeddableConversationList renders a conversation list — irrelevant here
jest.mock('./embeddable_conversation_list', () => ({
  EmbeddableConversationList: () => null,
}));

// EUI useEuiTheme — conversations_popover_view accesses size.* and colors.* inline
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: () => ({
      euiTheme: {
        size: { base: '16px', s: '8px', m: '12px', xs: '4px' },
        colors: { backgroundBaseSubdued: '#f5f5f5' },
      },
    }),
  };
});

jest.mock('@kbn/ebt-click', () => ({
  getEbtProps: jest.fn(() => ({})),
}));

jest.mock('../../common/agent_avatar', () => ({
  AgentAvatar: () => null,
}));

const mockUseConversationContext = jest.mocked(useConversationContext);
const mockUseStreamingContext = jest.mocked(useStreamingContext);
const mockUseAgentBuilderAgents = jest.mocked(useAgentBuilderAgents);
const mockUseAgentId = jest.mocked(useAgentId);

const renderView = (onClose = jest.fn()) =>
  render(
    <IntlProvider locale="en">
      <ConversationsPopoverView
        panelHeight={500}
        panelWidth={300}
        onSwitchToAgents={jest.fn()}
        onClose={onClose}
      />
    </IntlProvider>
  );

describe('ConversationsPopoverView — New chat button', () => {
  let setConversationId: jest.Mock;
  let resetAttachments: jest.Mock;
  let removeAllErrors: jest.Mock;

  beforeEach(() => {
    setConversationId = jest.fn();
    resetAttachments = jest.fn();
    removeAllErrors = jest.fn();

    mockUseConversationContext.mockReturnValue({
      setConversationId,
      resetAttachments,
      conversationActions: {} as never,
      isEmbeddedContext: true,
    });

    mockUseStreamingContext.mockReturnValue({
      removeAllErrors,
    } as unknown as ReturnType<typeof useStreamingContext>);

    mockUseAgentBuilderAgents.mockReturnValue({
      agents: [],
    } as unknown as ReturnType<typeof useAgentBuilderAgents>);

    mockUseAgentId.mockReturnValue('agent-1');
  });

  it('calls resetAttachments and setConversationId when "New chat" is clicked', () => {
    const onClose = jest.fn();
    renderView(onClose);

    fireEvent.click(screen.getByTestId('agentBuilderEmbeddableNewChatButton'));

    expect(resetAttachments).toHaveBeenCalledTimes(1);
    expect(setConversationId).toHaveBeenCalledWith(undefined);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

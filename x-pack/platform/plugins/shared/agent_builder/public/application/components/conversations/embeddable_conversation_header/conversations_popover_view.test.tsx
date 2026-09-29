/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ConversationsPopoverView } from './conversations_popover_view';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useAgentId } from '../../../hooks/use_conversation';

vi.mock('../../../context/conversation/conversation_context', () => {
  const mocked = {
    useConversationContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/agents/use_agents', () => {
  const mocked = {
    useAgentBuilderAgents: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_conversation', () => {
  const mocked = {
    useAgentId: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

// Stub child: EmbeddableConversationList renders a conversation list — irrelevant here
vi.mock('./embeddable_conversation_list', () => {
  const mocked = {
    EmbeddableConversationList: () => null,
  };
  return { ...mocked, default: mocked };
});

// EUI useEuiTheme — conversations_popover_view accesses size.* and colors.* inline
vi.mock('@elastic/eui', async () => {
  const actual = await vi.importActual('@elastic/eui');
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

vi.mock('@kbn/ebt-click', () => {
  const mocked = {
    getEbtProps: vi.fn(() => ({})),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../common/agent_avatar', () => {
  const mocked = {
    AgentAvatar: () => null,
  };
  return { ...mocked, default: mocked };
});

const mockUseConversationContext = vi.mocked(useConversationContext);
const mockUseAgentBuilderAgents = vi.mocked(useAgentBuilderAgents);
const mockUseAgentId = vi.mocked(useAgentId);

const renderView = (onClose = vi.fn()) =>
  render(
    <IntlProvider locale="en">
      <ConversationsPopoverView
        panelHeight={500}
        panelWidth={300}
        onSwitchToAgents={vi.fn()}
        onClose={onClose}
      />
    </IntlProvider>
  );

describe('ConversationsPopoverView — New chat button', () => {
  let setConversationId: Mock;
  let resetAttachments: Mock;

  beforeEach(() => {
    setConversationId = vi.fn();
    resetAttachments = vi.fn();

    mockUseConversationContext.mockReturnValue({
      setConversationId,
      resetAttachments,
      conversationActions: {} as never,
      isEmbeddedContext: true,
    });

    mockUseAgentBuilderAgents.mockReturnValue({
      agents: [],
    } as unknown as ReturnType<typeof useAgentBuilderAgents>);

    mockUseAgentId.mockReturnValue('agent-1');
  });

  it('calls resetAttachments and setConversationId when "New chat" is clicked', () => {
    const onClose = vi.fn();
    renderView(onClose);

    fireEvent.click(screen.getByTestId('agentBuilderEmbeddableNewChatButton'));

    expect(resetAttachments).toHaveBeenCalledTimes(1);
    expect(setConversationId).toHaveBeenCalledWith(undefined);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

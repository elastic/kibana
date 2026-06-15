/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { ConversationInput } from './conversation_input';
import { useConversationContext } from '../../../context/conversation/conversation_context';

// ── Context ──────────────────────────────────────────────────────────────────

jest.mock('../../../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));

// ── All hooks used by ConversationInput ─────────────────────────────────────

jest.mock('../../../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(() => 'conv-123'),
}));

jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(() => ({
    pendingMessage: undefined,
    error: undefined,
    isResuming: false,
    isResponseLoading: false,
  })),
}));

jest.mock('../../../hooks/use_submit_message', () => ({
  useSubmitMessage: jest.fn(() => jest.fn()),
}));

jest.mock('../../../hooks/agents/use_agents', () => ({
  useAgentBuilderAgents: jest.fn(() => ({ isFetched: true })),
}));

jest.mock('../../../hooks/agents/use_validate_agent_id', () => ({
  useValidateAgentId: jest.fn(() => () => true),
}));

jest.mock('../../../hooks/use_conversation', () => ({
  useAgentId: jest.fn(() => 'agent-1'),
  useConversationTitle: jest.fn(() => ({ title: 'Test Conversation' })),
  useHasActiveConversation: jest.fn(() => false),
  useIsAwaitingPrompt: jest.fn(() => false),
}));

jest.mock('../../../hooks/use_toasts', () => ({
  useToasts: jest.fn(() => ({ addErrorToast: jest.fn() })),
}));

// Stub child components so they don't need their own providers

jest.mock('./attachment_pills_row', () => ({
  AttachmentPillsRow: () => null,
}));

jest.mock('./input_actions', () => ({
  InputActions: () => null,
}));

jest.mock('@kbn/agent-builder-browser', () => ({
  ConversationInputShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useMessageEditor and expose a controllable mock controller
const mockSetContent = jest.fn();
const mockFocus = jest.fn();

jest.mock('./message_editor', () => ({
  MessageEditor: () => null,
  CommandBadgeSerializationError: class CommandBadgeSerializationError extends Error {},
  useMessageEditor: jest.fn(() => ({
    messageEditor: {
      ref: { current: null },
      onChange: jest.fn(),
      onFocus: jest.fn(),
      commandMatch: { isActive: false, activeCommand: null },
      dismissActionMenu: jest.fn(),
      handleCommandSelect: jest.fn(),
    },
    controller: {
      focus: mockFocus,
      getContent: jest.fn(() => ''),
      setContent: mockSetContent,
      clear: jest.fn(),
      isEmpty: true,
    } as MessageEditorController,
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockUseConversationContext = jest.mocked(useConversationContext);

const renderInput = () =>
  render(
    <IntlProvider locale="en">
      <ConversationInput />
    </IntlProvider>
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ConversationInput — initialMessage pre-population', () => {
  beforeEach(() => {
    mockSetContent.mockClear();
    mockFocus.mockClear();
  });

  it('pre-populates the input when a conversation is already open (isNewConversation guard removed)', () => {
    // conversationId is 'conv-123' (non-new) — mocked above
    const resetInitialMessage = jest.fn();

    mockUseConversationContext.mockReturnValue({
      isEmbeddedContext: true,
      attachments: undefined,
      initialMessage: 'Investigate this alert',
      autoSendInitialMessage: false,
      resetInitialMessage,
      conversationActions: {} as never,
    });

    renderInput();

    expect(mockSetContent).toHaveBeenCalledWith('Investigate this alert');
    expect(mockFocus).toHaveBeenCalled();
    expect(resetInitialMessage).toHaveBeenCalled();
  });

  it('does not set content when autoSendInitialMessage is true', () => {
    mockUseConversationContext.mockReturnValue({
      isEmbeddedContext: true,
      attachments: undefined,
      initialMessage: 'Should auto-send, not pre-populate',
      autoSendInitialMessage: true,
      resetInitialMessage: jest.fn(),
      conversationActions: {} as never,
    });

    renderInput();

    expect(mockSetContent).not.toHaveBeenCalled();
  });

  it('does not set content when initialMessage is absent', () => {
    mockUseConversationContext.mockReturnValue({
      isEmbeddedContext: true,
      attachments: undefined,
      initialMessage: undefined,
      autoSendInitialMessage: false,
      resetInitialMessage: jest.fn(),
      conversationActions: {} as never,
    });

    renderInput();

    expect(mockSetContent).not.toHaveBeenCalled();
  });
});

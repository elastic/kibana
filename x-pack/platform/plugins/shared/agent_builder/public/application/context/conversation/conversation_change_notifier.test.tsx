/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Conversation } from '@kbn/agent-builder-common';
import { ConversationChangeNotifier } from './conversation_change_notifier';

const mockEventsService = {
  setActiveConversation: jest.fn(),
  clearActiveConversation: jest.fn(),
};
let mockAgentId = 'elastic-ai-agent';
let mockConversationId: string | undefined;
let mockConversation: Conversation | undefined;
let mockIsError = false;

jest.mock('../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({ eventsService: mockEventsService }),
}));
jest.mock('../../hooks/use_conversation', () => ({
  useAgentId: () => mockAgentId,
  useConversation: () => ({
    conversation: mockConversation,
    isError: mockIsError,
    isFetched: mockConversation !== undefined,
  }),
}));
jest.mock('./use_conversation_id', () => ({
  useConversationId: () => mockConversationId,
}));
jest.mock('../../hooks/use_is_current_conversation_streaming', () => ({
  useIsCurrentConversationStreaming: () => false,
}));
jest.mock('../../hooks/use_conversation_list_mutations', () => ({
  useConversationListMutations: () => ({ markAsRead: jest.fn() }),
}));

describe('ConversationChangeNotifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAgentId = 'elastic-ai-agent';
    mockConversationId = undefined;
    mockConversation = undefined;
    mockIsError = false;
  });

  it('publishes the selected agent before a conversation exists', () => {
    render(<ConversationChangeNotifier />);

    expect(mockEventsService.setActiveConversation).toHaveBeenLastCalledWith({
      id: undefined,
      agentId: 'elastic-ai-agent',
    });
  });

  it('preserves an implicit embeddable selection when the space pins a default agent', () => {
    mockAgentId = 'space-default-agent';
    render(<ConversationChangeNotifier agentId={undefined} />);

    expect(mockEventsService.setActiveConversation).toHaveBeenLastCalledWith({
      id: undefined,
      agentId: undefined,
    });
  });

  it('publishes the session tag of an embedded chat so listeners can tell surfaces apart', () => {
    const { rerender } = render(<ConversationChangeNotifier sessionTag="workflow-editor:a" />);

    expect(mockEventsService.setActiveConversation).toHaveBeenLastCalledWith({
      id: undefined,
      agentId: 'elastic-ai-agent',
      sessionTag: 'workflow-editor:a',
    });

    mockEventsService.setActiveConversation.mockClear();
    rerender(<ConversationChangeNotifier sessionTag="workflow-execution-diagnose:e:s" />);

    expect(mockEventsService.setActiveConversation).toHaveBeenCalledTimes(1);
    expect(mockEventsService.setActiveConversation).toHaveBeenLastCalledWith({
      id: undefined,
      agentId: 'elastic-ai-agent',
      sessionTag: 'workflow-execution-diagnose:e:s',
    });
  });

  it('publishes no session tag for the routed chat', () => {
    render(<ConversationChangeNotifier />);

    expect(mockEventsService.setActiveConversation.mock.lastCall?.[0].sessionTag).toBeUndefined();
  });

  it('publishes an agent switch even when both conversations are new', () => {
    const { rerender } = render(<ConversationChangeNotifier />);
    mockEventsService.setActiveConversation.mockClear();

    mockAgentId = 'custom-workflow-agent';
    rerender(<ConversationChangeNotifier />);

    expect(mockEventsService.setActiveConversation).toHaveBeenCalledTimes(1);
    expect(mockEventsService.setActiveConversation).toHaveBeenLastCalledWith({
      id: undefined,
      agentId: 'custom-workflow-agent',
    });
  });

  it('publishes the agent with a fetched conversation', () => {
    mockAgentId = 'custom-workflow-agent';
    mockConversationId = 'conversation-a';
    mockConversation = { id: mockConversationId } as Conversation;
    render(<ConversationChangeNotifier />);

    expect(mockEventsService.setActiveConversation).toHaveBeenLastCalledWith({
      id: mockConversationId,
      agentId: mockAgentId,
      conversation: mockConversation,
    });
  });

  it('publishes the binding while a conversation is loading', () => {
    mockConversationId = 'loading-conversation';
    render(<ConversationChangeNotifier />);

    expect(mockEventsService.setActiveConversation).toHaveBeenLastCalledWith({
      id: mockConversationId,
      agentId: mockAgentId,
    });
  });

  it('publishes the selected agent when a conversation fails to load', () => {
    mockConversationId = 'missing-conversation';
    mockIsError = true;
    render(<ConversationChangeNotifier />);

    expect(mockEventsService.setActiveConversation).toHaveBeenLastCalledWith({
      id: mockConversationId,
      agentId: mockAgentId,
    });
  });

  it('clears the active conversation on unmount', () => {
    const { unmount } = render(<ConversationChangeNotifier />);
    unmount();
    expect(mockEventsService.clearActiveConversation).toHaveBeenCalledTimes(1);
  });
});

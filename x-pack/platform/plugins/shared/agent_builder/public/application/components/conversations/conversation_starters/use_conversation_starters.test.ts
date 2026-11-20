/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useResolvedAgent } from '../../../hooks/agents/use_resolved_agent';
import { useAgentId } from '../../../hooks/use_conversation';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useAgentSendState } from '../../../hooks/agents/use_agent_send_state';
import { useCurrentUser } from '../../../hooks/use_current_user';
import { useCarryOverDraft } from '../../../hooks/use_input_draft';
import { useActiveSpaceId } from '../../../context/active_space_context';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationStarters } from './use_conversation_starters';

jest.mock('../../../hooks/agents/use_resolved_agent');
jest.mock('../../../hooks/use_conversation');
jest.mock('../../../hooks/use_submit_message');
jest.mock('../../../hooks/agents/use_agent_send_state');
jest.mock('../../../hooks/use_current_user');
jest.mock('../../../hooks/use_input_draft');
jest.mock('../../../context/active_space_context');
jest.mock('../../../context/conversation/conversation_context');

const mockUseResolvedAgent = jest.mocked(useResolvedAgent);
const mockUseAgentId = jest.mocked(useAgentId);
const mockUseSubmitMessage = jest.mocked(useSubmitMessage);
const mockUseAgentSendState = jest.mocked(useAgentSendState);
const mockUseCurrentUser = jest.mocked(useCurrentUser);
const mockUseCarryOverDraft = jest.mocked(useCarryOverDraft);
const mockUseActiveSpaceId = jest.mocked(useActiveSpaceId);
const mockUseConversationContext = jest.mocked(useConversationContext);

const submitMessage = jest.fn();
const takeNewChatDraft = jest.fn();
const saveDraftTo = jest.fn();

const mockAgent = (agent: Record<string, unknown> | undefined, isLoading = false) => {
  mockUseResolvedAgent.mockReturnValue({ agent: agent as never, isLoading });
};

const mockSendState = (overrides: Partial<ReturnType<typeof useAgentSendState>> = {}) => {
  mockUseAgentSendState.mockReturnValue({
    agentExists: true,
    isAgentDeleted: false,
    isBoundAgentForbidden: false,
    isAgentModelLoading: false,
    ...overrides,
  });
};

const submitCreatesConversation = (conversationId = 'conv-1') => {
  submitMessage.mockImplementation(
    (_message: string, options?: { onConversationCreated?: (id: string) => void }) =>
      options?.onConversationCreated?.(conversationId)
  );
};

describe('useConversationStarters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    submitMessage.mockReset();
    mockUseAgentId.mockReturnValue('agent-1');
    mockUseSubmitMessage.mockReturnValue({ submitMessage, isCreatingConversation: false });
    mockSendState();
    mockUseActiveSpaceId.mockReturnValue('default');
    mockUseConversationContext.mockReturnValue({ sessionTag: 'tag' } as never);
    mockUseCurrentUser.mockReturnValue({ currentUser: { user: { username: 'elastic' } } } as never);
    takeNewChatDraft.mockReturnValue(null);
    mockUseCarryOverDraft.mockReturnValue({ takeNewChatDraft, saveDraftTo });
    mockAgent({
      id: 'agent-1',
      conversation_starters: [{ label: 'first' }, { label: 'second', prompt: 'Second prompt' }],
    });
  });

  it('returns the starters of the selected agent', () => {
    const { result } = renderHook(() => useConversationStarters());

    expect(mockUseResolvedAgent).toHaveBeenCalledWith('agent-1');
    expect(result.current.starters).toEqual([
      { label: 'first' },
      { label: 'second', prompt: 'Second prompt' },
    ]);
  });

  it('returns the starters even though isLoading stays true for an agent found in the list', () => {
    mockAgent({ id: 'agent-1', conversation_starters: [{ label: 'first' }] }, true);

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.starters).toEqual([{ label: 'first' }]);
  });

  it('returns no starters while the agent is loading', () => {
    mockAgent(undefined, true);

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.starters).toEqual([]);
  });

  it('returns no starters when the agent does not exist', () => {
    mockSendState({ agentExists: false });

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.starters).toEqual([]);
  });

  it('returns no starters when the agent is bound and the user cannot invoke it', () => {
    mockSendState({ isBoundAgentForbidden: true });

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.starters).toEqual([]);
  });

  it('returns no starters when the agent has none', () => {
    mockAgent({ id: 'agent-1' });

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.starters).toEqual([]);
  });

  it('sends the label of a starter without a prompt', () => {
    const { result } = renderHook(() => useConversationStarters());

    act(() => {
      result.current.onSelect({ label: 'first' });
    });

    expect(submitMessage).toHaveBeenCalledWith('first', expect.any(Object));
  });

  it('sends the prompt of a starter instead of its label', () => {
    const { result } = renderHook(() => useConversationStarters());

    act(() => {
      result.current.onSelect({ label: 'second', prompt: 'Second prompt' });
    });

    expect(submitMessage).toHaveBeenCalledWith('Second prompt', expect.any(Object));
  });

  it('carries drafts over for the current user and agent', () => {
    renderHook(() => useConversationStarters());

    expect(mockUseCarryOverDraft).toHaveBeenCalledWith({
      spaceId: 'default',
      sessionTag: 'tag',
      username: 'elastic',
      agentId: 'agent-1',
    });
  });

  describe('when text was typed before a starter is clicked', () => {
    const sendStarterAndCreateConversation = () => {
      submitCreatesConversation();
      const { result } = renderHook(() => useConversationStarters());

      act(() => {
        result.current.onSelect({ label: 'first' });
      });
    };

    beforeEach(() => {
      takeNewChatDraft.mockReturnValue('typed text');
    });

    it('moves the typed text to the input of the conversation that starts', () => {
      sendStarterAndCreateConversation();

      expect(takeNewChatDraft).toHaveBeenCalledTimes(1);
      expect(saveDraftTo).toHaveBeenCalledWith('conv-1', 'typed text');
    });

    it('sends the starter and not the typed text', () => {
      sendStarterAndCreateConversation();

      expect(submitMessage).toHaveBeenCalledWith('first', expect.any(Object));
    });

    it('keeps the typed text where it is when the conversation cannot be created', () => {
      const { result } = renderHook(() => useConversationStarters());

      act(() => {
        result.current.onSelect({ label: 'first' });
      });

      expect(takeNewChatDraft).not.toHaveBeenCalled();
      expect(saveDraftTo).not.toHaveBeenCalled();
    });
  });

  it('stores no draft in the new conversation when nothing was typed', () => {
    takeNewChatDraft.mockReturnValue(null);
    submitCreatesConversation();
    const { result } = renderHook(() => useConversationStarters());

    act(() => {
      result.current.onSelect({ label: 'first' });
    });

    expect(saveDraftTo).not.toHaveBeenCalled();
  });

  it('is disabled while the agent model is loading', () => {
    mockSendState({ isAgentModelLoading: true });

    const { result } = renderHook(() => useConversationStarters());

    expect(mockUseAgentSendState).toHaveBeenCalledWith('agent-1');
    expect(result.current.isDisabled).toBe(true);
  });

  it('is disabled while a conversation is being created', () => {
    mockUseSubmitMessage.mockReturnValue({ submitMessage, isCreatingConversation: true });

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.isDisabled).toBe(true);
  });
});

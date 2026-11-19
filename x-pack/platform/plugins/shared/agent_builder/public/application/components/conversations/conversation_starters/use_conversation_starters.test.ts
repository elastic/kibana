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
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { useAgentModel } from '../../../hooks/agents/use_agent_model';
import { useCurrentUser } from '../../../hooks/use_current_user';
import { useInputDraft } from '../../../hooks/use_input_draft';
import { useActiveSpaceId } from '../../../context/active_space_context';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useConversationStarters } from './use_conversation_starters';

jest.mock('../../../hooks/agents/use_resolved_agent');
jest.mock('../../../hooks/use_conversation');
jest.mock('../../../hooks/use_submit_message');
jest.mock('../../../hooks/use_ui_privileges');
jest.mock('../../../hooks/agents/use_agent_model');
jest.mock('../../../hooks/use_current_user');
jest.mock('../../../hooks/use_input_draft');
jest.mock('../../../context/active_space_context');
jest.mock('../../../context/conversation/conversation_context');

const mockUseResolvedAgent = jest.mocked(useResolvedAgent);
const mockUseAgentId = jest.mocked(useAgentId);
const mockUseSubmitMessage = jest.mocked(useSubmitMessage);
const mockUseUiPrivileges = jest.mocked(useUiPrivileges);
const mockUseAgentModel = jest.mocked(useAgentModel);
const mockUseCurrentUser = jest.mocked(useCurrentUser);
const mockUseInputDraft = jest.mocked(useInputDraft);
const mockUseActiveSpaceId = jest.mocked(useActiveSpaceId);
const mockUseConversationContext = jest.mocked(useConversationContext);

const submitMessage = jest.fn();
const clearDraft = jest.fn();

const mockAgent = (agent: Record<string, unknown> | undefined, isLoading = false) => {
  mockUseResolvedAgent.mockReturnValue({ agent: agent as never, isLoading });
};

describe('useConversationStarters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentId.mockReturnValue('agent-1');
    mockUseSubmitMessage.mockReturnValue({ submitMessage, isCreatingConversation: false });
    mockUseUiPrivileges.mockReturnValue({ invokeBoundAgents: true } as never);
    mockUseAgentModel.mockReturnValue({ isLoading: false, isLocked: false });
    mockUseActiveSpaceId.mockReturnValue('default');
    mockUseConversationContext.mockReturnValue({ sessionTag: 'tag' } as never);
    mockUseCurrentUser.mockReturnValue({ currentUser: { user: { username: 'elastic' } } } as never);
    mockUseInputDraft.mockReturnValue({ draft: null, saveDraft: jest.fn(), clearDraft });
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

  it('returns no starters while the agent is loading', () => {
    mockAgent(undefined, true);

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.starters).toEqual([]);
  });

  it('returns no starters when the agent is not found', () => {
    mockAgent(undefined);

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.starters).toEqual([]);
  });

  it('returns no starters when the agent is bound and the user cannot invoke it', () => {
    mockAgent({
      id: 'agent-1',
      service_account_id: 'sa-1',
      conversation_starters: [{ label: 'first' }],
    });
    mockUseUiPrivileges.mockReturnValue({ invokeBoundAgents: false } as never);

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

    expect(submitMessage).toHaveBeenCalledWith('first');
  });

  it('sends the prompt of a starter instead of its label', () => {
    const { result } = renderHook(() => useConversationStarters());

    act(() => {
      result.current.onSelect({ label: 'second', prompt: 'Second prompt' });
    });

    expect(submitMessage).toHaveBeenCalledWith('Second prompt');
  });

  it('clears the unsent draft of the new conversation when a starter is sent', () => {
    const { result } = renderHook(() => useConversationStarters());

    act(() => {
      result.current.onSelect({ label: 'first' });
    });

    expect(mockUseInputDraft).toHaveBeenCalledWith({
      spaceId: 'default',
      sessionTag: 'tag',
      username: 'elastic',
      agentId: 'agent-1',
      conversationId: undefined,
    });
    expect(clearDraft).toHaveBeenCalledTimes(1);
  });

  it('is disabled while the agent model is loading', () => {
    mockUseAgentModel.mockReturnValue({ isLoading: true, isLocked: false });

    const { result } = renderHook(() => useConversationStarters());

    expect(mockUseAgentModel).toHaveBeenCalledWith('agent-1');
    expect(result.current.isDisabled).toBe(true);
  });

  it('is disabled while a conversation is being created', () => {
    mockUseSubmitMessage.mockReturnValue({ submitMessage, isCreatingConversation: true });

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.isDisabled).toBe(true);
  });
});

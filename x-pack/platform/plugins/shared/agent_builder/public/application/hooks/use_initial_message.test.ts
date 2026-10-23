/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSendPredefinedInitialMessage } from './use_initial_message';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useAgentId } from './use_conversation';
import { useValidateAgentId } from './agents/use_validate_agent_id';
import { useAgentBuilderAgents } from './agents/use_agents';
import { useAgentBuilderAgentById } from './agents/use_agent_by_id';
import { useAgentModel } from './agents/use_agent_model';
import { useSubmitMessage } from './use_submit_message';

jest.mock('../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));
jest.mock('../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));
jest.mock('./use_conversation', () => ({
  useAgentId: jest.fn(),
}));
jest.mock('./agents/use_validate_agent_id', () => ({
  useValidateAgentId: jest.fn(),
}));
jest.mock('./agents/use_agents', () => ({
  useAgentBuilderAgents: jest.fn(),
}));
jest.mock('./agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: jest.fn(),
}));
jest.mock('./agents/use_agent_model', () => ({
  useAgentModel: jest.fn(),
}));
jest.mock('./use_submit_message', () => ({
  useSubmitMessage: jest.fn(),
}));

const mockedUseConversationContext = jest.mocked(useConversationContext);
const mockedUseConversationId = jest.mocked(useConversationId);
const mockedUseAgentId = jest.mocked(useAgentId);
const mockedUseValidateAgentId = jest.mocked(useValidateAgentId);
const mockedUseAgentBuilderAgents = jest.mocked(useAgentBuilderAgents);
const mockedUseAgentBuilderAgentById = jest.mocked(useAgentBuilderAgentById);
const mockedUseAgentModel = jest.mocked(useAgentModel);
const mockedUseSubmitMessage = jest.mocked(useSubmitMessage);

describe('useSendPredefinedInitialMessage', () => {
  const submitMessage = jest.fn();
  const resetInitialMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseConversationId.mockReturnValue(undefined);
    mockedUseAgentId.mockReturnValue('agent-1');
    mockedUseAgentModel.mockReturnValue({ isLoading: false } as any);
    mockedUseSubmitMessage.mockReturnValue({ submitMessage } as any);
    mockedUseConversationContext.mockReturnValue({
      initialMessage: 'hello',
      autoSendInitialMessage: true,
      resetInitialMessage,
    } as any);
  });

  it('sends the initial message when the agent is in the visible agents list', () => {
    mockedUseValidateAgentId.mockReturnValue(
      ((agentId?: string): agentId is string => true) as never
    );
    mockedUseAgentBuilderAgents.mockReturnValue({ isFetched: true } as any);
    mockedUseAgentBuilderAgentById.mockReturnValue({ agent: null } as any);

    renderHook(() => useSendPredefinedInitialMessage());

    expect(submitMessage).toHaveBeenCalledWith('hello');
    expect(resetInitialMessage).toHaveBeenCalled();
  });

  it('falls back to a by-ID lookup and still sends when the agent is hidden from the list', () => {
    mockedUseValidateAgentId.mockReturnValue(
      ((agentId?: string): agentId is string => false) as never
    );
    mockedUseAgentBuilderAgents.mockReturnValue({ isFetched: true } as any);
    mockedUseAgentBuilderAgentById.mockReturnValue({ agent: { id: 'agent-1' } } as any);

    renderHook(() => useSendPredefinedInitialMessage());

    expect(mockedUseAgentBuilderAgentById).toHaveBeenCalledWith('agent-1');
    expect(submitMessage).toHaveBeenCalledWith('hello');
    expect(resetInitialMessage).toHaveBeenCalled();
  });

  it('does not send when the agent is neither in the list nor found by ID', () => {
    mockedUseValidateAgentId.mockReturnValue(
      ((agentId?: string): agentId is string => false) as never
    );
    mockedUseAgentBuilderAgents.mockReturnValue({ isFetched: true } as any);
    mockedUseAgentBuilderAgentById.mockReturnValue({ agent: null } as any);

    renderHook(() => useSendPredefinedInitialMessage());

    expect(submitMessage).not.toHaveBeenCalled();
    expect(resetInitialMessage).not.toHaveBeenCalled();
  });

  it('does not attempt a by-ID lookup until the visible agents list has loaded', () => {
    mockedUseValidateAgentId.mockReturnValue(
      ((agentId?: string): agentId is string => false) as never
    );
    mockedUseAgentBuilderAgents.mockReturnValue({ isFetched: false } as any);
    mockedUseAgentBuilderAgentById.mockReturnValue({ agent: null } as any);

    renderHook(() => useSendPredefinedInitialMessage());

    expect(mockedUseAgentBuilderAgentById).toHaveBeenCalledWith(undefined);
    expect(submitMessage).not.toHaveBeenCalled();
  });
});

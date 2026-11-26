/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { useAgentId } from '../../../hooks/use_conversation';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { useAgentModel } from '../../../hooks/agents/use_agent_model';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { DEFAULT_CONVERSATION_STARTERS } from './default_conversation_starters';
import { useConversationStarters } from './use_conversation_starters';

jest.mock('../../../hooks/use_conversation');
jest.mock('../../../hooks/use_submit_message');
jest.mock('../../../hooks/agents/use_agent_model');
jest.mock('../../../hooks/use_experimental_features');

const mockUseAgentId = jest.mocked(useAgentId);
const mockUseSubmitMessage = jest.mocked(useSubmitMessage);
const mockUseAgentModel = jest.mocked(useAgentModel);
const mockUseExperimentalFeatures = jest.mocked(useExperimentalFeatures);

const submitMessage = jest.fn();

describe('useConversationStarters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentId.mockReturnValue(agentBuilderDefaultAgentId);
    mockUseExperimentalFeatures.mockReturnValue(true);
    mockUseSubmitMessage.mockReturnValue({ submitMessage, isCreatingConversation: false });
    mockUseAgentModel.mockReturnValue({ isLoading: false, isLocked: false });
  });

  it('returns the default starters for the default agent', () => {
    const { result } = renderHook(() => useConversationStarters());

    expect(mockUseAgentModel).toHaveBeenCalledWith(agentBuilderDefaultAgentId);
    expect(result.current.starters).toEqual(DEFAULT_CONVERSATION_STARTERS);
    expect(result.current.source).toBe('default');
  });

  it('returns no starters while the experimental features are off', () => {
    mockUseExperimentalFeatures.mockReturnValue(false);

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.starters).toEqual([]);
  });

  it('returns no starters for any other agent', () => {
    mockUseAgentId.mockReturnValue('agent-1');

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.starters).toEqual([]);
  });

  it('sends the label of the starter as the message', () => {
    const { result } = renderHook(() => useConversationStarters());

    act(() => {
      result.current.onSelect({ label: 'first' });
    });

    expect(submitMessage).toHaveBeenCalledWith('first');
  });

  it('is enabled when nothing is loading', () => {
    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.isDisabled).toBe(false);
  });

  it('is disabled while a conversation is being created', () => {
    mockUseSubmitMessage.mockReturnValue({ submitMessage, isCreatingConversation: true });

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.isDisabled).toBe(true);
  });

  it('is disabled while the agent model is loading', () => {
    mockUseAgentModel.mockReturnValue({ isLoading: true, isLocked: false });

    const { result } = renderHook(() => useConversationStarters());

    expect(result.current.isDisabled).toBe(true);
  });
});

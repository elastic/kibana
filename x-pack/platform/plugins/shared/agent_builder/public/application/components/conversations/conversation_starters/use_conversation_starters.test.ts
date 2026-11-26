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
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { DEFAULT_CONVERSATION_STARTERS } from './default_conversation_starters';
import { getSolutionConversationStarters } from './solution_conversation_starters';
import { useConversationStarters } from './use_conversation_starters';

jest.mock('../../../hooks/use_conversation');
jest.mock('../../../hooks/use_submit_message');
jest.mock('../../../hooks/agents/use_agent_model');
jest.mock('../../../hooks/use_experimental_features');
jest.mock('../../../context/conversation/conversation_context');
jest.mock('./solution_conversation_starters');

const mockUseAgentId = jest.mocked(useAgentId);
const mockUseSubmitMessage = jest.mocked(useSubmitMessage);
const mockUseAgentModel = jest.mocked(useAgentModel);
const mockUseExperimentalFeatures = jest.mocked(useExperimentalFeatures);
const mockUseConversationContext = jest.mocked(useConversationContext);
const mockGetSolutionConversationStarters = jest.mocked(getSolutionConversationStarters);

const submitMessage = jest.fn();

const appStarters = [{ label: 'Top errors' }];
const solutionStarters = [{ label: 'Open alerts' }];

const renderStarters = (options: Parameters<typeof useConversationStarters>[0] = {}) =>
  renderHook(() => useConversationStarters({ solution: 'classic', ...options }));

describe('useConversationStarters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentId.mockReturnValue(agentBuilderDefaultAgentId);
    mockUseExperimentalFeatures.mockReturnValue(true);
    mockUseSubmitMessage.mockReturnValue({ submitMessage, isCreatingConversation: false });
    mockUseAgentModel.mockReturnValue({ isLoading: false, isLocked: false });
    mockUseConversationContext.mockReturnValue({} as never);
    mockGetSolutionConversationStarters.mockReturnValue([]);
  });

  it('returns the default starters for the default agent', () => {
    const { result } = renderStarters();

    expect(mockUseAgentModel).toHaveBeenCalledWith(agentBuilderDefaultAgentId);
    expect(result.current.starters).toEqual(DEFAULT_CONVERSATION_STARTERS);
    expect(result.current.source).toBe('default');
  });

  it('returns the starters of the solution instead of the default ones', () => {
    mockGetSolutionConversationStarters.mockReturnValue(solutionStarters);

    const { result } = renderStarters({ solution: 'security' });

    expect(mockGetSolutionConversationStarters).toHaveBeenCalledWith('security');
    expect(result.current.starters).toEqual(solutionStarters);
    expect(result.current.source).toBe('solution');
  });

  it('returns the starters of the app instead of those of the solution', () => {
    mockGetSolutionConversationStarters.mockReturnValue(solutionStarters);
    mockUseConversationContext.mockReturnValue({ conversationStarters: appStarters } as never);

    const { result } = renderStarters({ solution: 'security' });

    expect(result.current.starters).toEqual(appStarters);
    expect(result.current.source).toBe('application');
  });

  it('returns the starters of the app while the experimental features are off', () => {
    mockUseExperimentalFeatures.mockReturnValue(false);
    mockUseConversationContext.mockReturnValue({ conversationStarters: appStarters } as never);

    const { result } = renderStarters();

    expect(result.current.starters).toEqual(appStarters);
  });

  it('returns no default or solution starters while the experimental features are off', () => {
    mockUseExperimentalFeatures.mockReturnValue(false);
    mockGetSolutionConversationStarters.mockReturnValue(solutionStarters);

    const { result } = renderStarters({ solution: 'security' });

    expect(result.current.starters).toEqual([]);
  });

  it('returns no default or solution starters while the solution is loading', () => {
    mockGetSolutionConversationStarters.mockReturnValue(solutionStarters);

    const { result } = renderStarters({ solution: undefined });

    expect(result.current.starters).toEqual([]);
  });

  it('returns no starters for any other agent, not even those of the app', () => {
    mockUseAgentId.mockReturnValue('agent-1');
    mockGetSolutionConversationStarters.mockReturnValue(solutionStarters);
    mockUseConversationContext.mockReturnValue({ conversationStarters: appStarters } as never);

    const { result } = renderStarters({ solution: 'security' });

    expect(result.current.starters).toEqual([]);
  });

  it('sends the label of the starter as the message when it has no prompt', () => {
    const { result } = renderStarters();

    act(() => {
      result.current.onSelect({ label: 'first' });
    });

    expect(submitMessage).toHaveBeenCalledWith('first');
  });

  it('sends the prompt of the starter instead of the label when it has one', () => {
    const { result } = renderStarters();

    act(() => {
      result.current.onSelect({ label: 'first', prompt: 'Tell me about the first' });
    });

    expect(submitMessage).toHaveBeenCalledWith('Tell me about the first');
  });

  it('is disabled while a conversation is being created', () => {
    mockUseSubmitMessage.mockReturnValue({ submitMessage, isCreatingConversation: true });

    const { result } = renderStarters();

    expect(result.current.isDisabled).toBe(true);
  });

  it('is disabled while the agent model is loading', () => {
    mockUseAgentModel.mockReturnValue({ isLoading: true, isLocked: false });

    const { result } = renderStarters();

    expect(result.current.isDisabled).toBe(true);
  });
});

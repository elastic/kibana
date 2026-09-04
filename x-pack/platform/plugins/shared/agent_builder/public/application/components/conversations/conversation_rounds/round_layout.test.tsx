/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ConversationOriginType,
  ConversationRoundStatus,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import { createReasoningStep } from '@kbn/agent-builder-common/chat/conversation';
import { AgentPromptType, type AgentDefinition } from '@kbn/agent-builder-common/agents';
import { RoundLayout } from './round_layout';
import { RoundInput } from './round_input';
import { RoundEvents } from './round_events/round_events';
import { RoundResponse } from './round_response/round_response';
import { AgentAvatar } from '../../common/agent_avatar';
import { RoundAuthorHeader } from './round_author_header';
import { useAgentBuilderAgentById } from '../../../hooks/agents/use_agent_by_id';
import { useAgentId, useConversationReadOnly } from '../../../hooks/use_conversation';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { pendingRoundId } from '../../../utils/new_conversation';
import { ConfirmationPrompt } from './round_prompt';

jest.mock('./round_input', () => ({
  RoundInput: jest.fn(() => null),
}));

jest.mock('./round_response/round_response', () => ({
  RoundResponse: jest.fn(({ response }) => (
    <div data-test-subj="agentBuilderRoundResponse">{response.message}</div>
  )),
}));

jest.mock('./round_events/round_events', () => ({
  RoundEvents: jest.fn(() => <div data-test-subj="agentBuilderThinkingPanel">Reasoning</div>),
}));

jest.mock('../../common/agent_avatar', () => ({
  AgentAvatar: jest.fn(({ agent }) => (
    <div data-test-subj="agentBuilderAssistantAvatar">{agent.name} avatar</div>
  )),
}));

jest.mock('./round_author_header', () => ({
  RoundAuthorHeader: jest.fn(({ name }) => (
    <div data-test-subj="agentBuilderAssistantAttribution">{name}</div>
  )),
}));

jest.mock('./round_error/round_error', () => ({
  RoundError: () => null,
}));

jest.mock('./round_prompt', () => ({
  ConfirmationPrompt: jest.fn(() => null),
  AuthorizationPrompt: jest.fn(() => null),
  AskUserQuestionPrompt: jest.fn(() => null),
}));

jest.mock('./round_attachment_references', () => ({
  RoundAttachmentReferences: () => null,
}));

jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));

jest.mock('../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: jest.fn(),
}));

jest.mock('../../../hooks/use_conversation', () => ({
  useAgentId: jest.fn(),
  useConversationReadOnly: jest.fn(),
}));

const useConversationStreamMock = useConversationStream as jest.MockedFunction<
  typeof useConversationStream
>;
const useAgentIdMock = jest.mocked(useAgentId);
const useConversationReadOnlyMock = jest.mocked(useConversationReadOnly);
const useAgentBuilderAgentByIdMock = jest.mocked(useAgentBuilderAgentById);
const roundInputMock = RoundInput as jest.MockedFunction<typeof RoundInput>;
const roundEventsMock = RoundEvents as jest.MockedFunction<typeof RoundEvents>;
const roundResponseMock = RoundResponse as jest.MockedFunction<typeof RoundResponse>;
const agentAvatarMock = jest.mocked(AgentAvatar);
const roundAuthorHeaderMock = jest.mocked(RoundAuthorHeader);
const confirmationPromptMock = jest.mocked(ConfirmationPrompt);
const agent: AgentDefinition = {
  id: 'agent-1',
  type: 'chat',
  name: 'Threat Hunting Agent',
  description: '',
  readonly: false,
  configuration: {
    tools: [],
  },
};

const createRound = (version: number): ConversationRound =>
  ({
    id: 'round-1',
    status: ConversationRoundStatus.completed,
    input: {
      message: 'show me the preview',
      attachment_refs: [{ attachment_id: 'attachment-1', version }],
    },
    steps: [],
    response: {
      message: 'preview attached',
    },
    started_at: '2026-01-01T00:00:00.000Z',
    time_to_first_token: 1,
    time_to_last_token: 1,
    model_usage: {
      connector_id: 'connector-1',
      llm_calls: 1,
      input_tokens: 1,
      output_tokens: 1,
    },
  } as ConversationRound);

describe('RoundLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAgentIdMock.mockReturnValue('agent-1');
    useConversationReadOnlyMock.mockReturnValue({ isReadOnly: false, isLoading: false });
    useAgentBuilderAgentByIdMock.mockReturnValue({
      agent,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useAgentBuilderAgentById>);
    useConversationStreamMock.mockReturnValue({
      sendMessage: jest.fn(),
      isResponseLoading: false,
      isStreaming: false,
      pendingMessage: undefined,
      error: null,
      errorSteps: [],
      retry: jest.fn(),
      canCancel: false,
      cancel: jest.fn(),
      removeError: jest.fn(),
      resumeRound: jest.fn(),
      isResuming: false,
      regenerate: jest.fn(),
      isRegenerating: false,
    } as ReturnType<typeof useConversationStream>);
  });

  it('keeps equivalent attachmentRefs stable across unrelated allRounds identity changes', () => {
    const firstRound = createRound(1);

    const { rerender } = render(
      <RoundLayout
        allRounds={[firstRound]}
        conversationId="conversation-1"
        isCurrentRound={false}
        rawRound={firstRound}
        roundIndex={0}
      />
    );

    const firstAttachmentRefs = roundResponseMock.mock.calls[0][0].attachmentRefs;

    const equivalentRound = createRound(1);
    rerender(
      <RoundLayout
        allRounds={[equivalentRound]}
        conversationId="conversation-1"
        isCurrentRound={false}
        rawRound={equivalentRound}
        roundIndex={0}
      />
    );

    expect(roundResponseMock.mock.calls[1][0].attachmentRefs).toBe(firstAttachmentRefs);
  });

  it('updates attachmentRefs when the referenced attachment version changes', () => {
    const firstRound = createRound(1);

    const { rerender } = render(
      <RoundLayout
        allRounds={[firstRound]}
        conversationId="conversation-1"
        isCurrentRound={false}
        rawRound={firstRound}
        roundIndex={0}
      />
    );

    const firstAttachmentRefs = roundResponseMock.mock.calls[0][0].attachmentRefs;

    const updatedRound = createRound(2);
    rerender(
      <RoundLayout
        allRounds={[updatedRound]}
        conversationId="conversation-1"
        isCurrentRound={false}
        rawRound={updatedRound}
        roundIndex={0}
      />
    );

    expect(roundResponseMock.mock.calls[1][0].attachmentRefs).not.toBe(firstAttachmentRefs);
    expect(roundResponseMock.mock.calls[1][0].attachmentRefs).toEqual([
      { attachment_id: 'attachment-1', version: 2 },
    ]);
  });

  it('passes round attribution through to the user and agent renderers', () => {
    const round = {
      ...createRound(1),
      author: {
        id: 'user-1',
        full_name: 'Jane Doe',
        username: 'jdoe',
      },
      origin: {
        type: ConversationOriginType.Slack,
      },
    };

    render(
      <RoundLayout
        allRounds={[round]}
        conversationId="conversation-1"
        isCurrentRound={false}
        rawRound={round}
        roundIndex={0}
      />
    );

    const roundInputProps = roundInputMock.mock.calls[0][0];
    expect(roundInputProps).toEqual(
      expect.objectContaining({
        author: round.author,
        isPendingCurrentRound: false,
        origin: round.origin,
        startedAt: round.started_at,
      })
    );
    expect(roundInputProps).not.toHaveProperty('authorProfile');
    expect(roundInputProps).not.toHaveProperty('isCurrentUser');
    expect(roundAuthorHeaderMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: agent.name,
        showAgentBadge: true,
        origin: round.origin,
        startedAt: round.started_at,
      })
    );
    expect(roundResponseMock.mock.calls[0][0]).not.toHaveProperty('startedAt');
  });

  it('renders the agent attribution before reasoning and response content', () => {
    const round = {
      ...createRound(1),
      steps: [createReasoningStep({ reasoning: 'Checking indices' })],
    };

    render(
      <RoundLayout
        allRounds={[round]}
        conversationId="conversation-1"
        isCurrentRound={false}
        rawRound={round}
        roundIndex={0}
      />
    );

    const attribution = screen.getByTestId('agentBuilderAssistantAttribution');
    const thinkingPanel = screen.getByTestId('agentBuilderThinkingPanel');
    const response = screen.getByTestId('agentBuilderRoundResponse');

    expect(roundAuthorHeaderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: agent.name,
        showAgentBadge: true,
        startedAt: round.started_at,
      }),
      expect.anything()
    );
    expect(roundEventsMock).toHaveBeenCalled();
    expect(attribution.compareDocumentPosition(thinkingPanel)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(attribution.compareDocumentPosition(response)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders the agent avatar beside the agent output content', () => {
    const round = {
      ...createRound(1),
      steps: [createReasoningStep({ reasoning: 'Checking indices' })],
    };

    render(
      <RoundLayout
        allRounds={[round]}
        conversationId="conversation-1"
        isCurrentRound={false}
        rawRound={round}
        roundIndex={0}
      />
    );

    const layout = screen.getByTestId('agentBuilderRoundAgentLayout');
    const avatar = screen.getByTestId('agentBuilderRoundAgentAvatar');
    const content = screen.getByTestId('agentBuilderRoundAgentContent');

    expect(agentAvatarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agent,
      }),
      expect.anything()
    );
    expect(content).toContainElement(screen.getByTestId('agentBuilderAssistantAttribution'));
    expect(content).toContainElement(screen.getByTestId('agentBuilderThinkingPanel'));
    expect(content).toContainElement(screen.getByTestId('agentBuilderRoundResponse'));
    expect(layout.firstElementChild).toBe(avatar);
    expect(avatar.nextElementSibling).toBe(content);
  });

  it('reserves the agent avatar column while the agent is loading', () => {
    useAgentBuilderAgentByIdMock.mockReturnValue({
      agent: null,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useAgentBuilderAgentById>);

    const round = {
      ...createRound(1),
      steps: [createReasoningStep({ reasoning: 'Checking indices' })],
    };

    render(
      <RoundLayout
        allRounds={[round]}
        conversationId="conversation-1"
        isCurrentRound={false}
        rawRound={round}
        roundIndex={0}
      />
    );

    const layout = screen.getByTestId('agentBuilderRoundAgentLayout');
    const avatar = screen.getByTestId('agentBuilderRoundAgentAvatar');
    const content = screen.getByTestId('agentBuilderRoundAgentContent');

    expect(agentAvatarMock).not.toHaveBeenCalled();
    expect(avatar).toBeEmptyDOMElement();
    expect(content).toContainElement(screen.getByTestId('agentBuilderThinkingPanel'));
    expect(content).toContainElement(screen.getByTestId('agentBuilderRoundResponse'));
    expect(layout.firstElementChild).toBe(avatar);
    expect(avatar.nextElementSibling).toBe(content);
  });

  it('replaces the current round agent avatar with the streaming loader while loading', () => {
    useConversationStreamMock.mockReturnValue({
      sendMessage: jest.fn(),
      isResponseLoading: true,
      isStreaming: true,
      pendingMessage: undefined,
      error: null,
      errorSteps: [],
      retry: jest.fn(),
      canCancel: false,
      cancel: jest.fn(),
      removeError: jest.fn(),
      resumeRound: jest.fn(),
      isResuming: false,
      regenerate: jest.fn(),
      isRegenerating: false,
    } as ReturnType<typeof useConversationStream>);

    const round = createRound(1);

    render(
      <RoundLayout
        allRounds={[round]}
        conversationId="conversation-1"
        isCurrentRound={true}
        rawRound={round}
        roundIndex={0}
      />
    );

    const avatar = screen.getByTestId('agentBuilderRoundAgentAvatar');
    const loader = screen.getByLabelText('Streaming response');

    expect(avatar).toContainElement(loader);
    expect(agentAvatarMock).not.toHaveBeenCalled();
  });

  it('passes pending round context to the input renderer', () => {
    const round = {
      ...createRound(1),
      id: pendingRoundId,
      status: ConversationRoundStatus.inProgress,
    };

    render(
      <RoundLayout
        allRounds={[round]}
        conversationId="conversation-1"
        isCurrentRound={true}
        rawRound={round}
        roundIndex={0}
      />
    );

    expect(roundInputMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        author: undefined,
        isPendingCurrentRound: true,
      })
    );
  });

  it('disables awaiting prompt controls for read-only conversations', () => {
    useConversationReadOnlyMock.mockReturnValue({ isReadOnly: true, isLoading: false });

    const round = {
      ...createRound(1),
      status: ConversationRoundStatus.awaitingPrompt,
      pending_prompts: [
        {
          id: 'prompt-1',
          type: AgentPromptType.confirmation,
          message: 'Proceed?',
        },
      ],
    } as ConversationRound;

    render(
      <RoundLayout
        allRounds={[round]}
        conversationId="conversation-1"
        isCurrentRound={true}
        rawRound={round}
        roundIndex={0}
      />
    );

    expect(confirmationPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isDisabled: true,
      }),
      expect.anything()
    );
  });
});

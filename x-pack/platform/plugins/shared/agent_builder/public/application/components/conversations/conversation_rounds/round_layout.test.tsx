/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ConversationRoundStatus, type ConversationRound } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { RoundLayout } from './round_layout';
import { RoundResponse } from './round_response/round_response';
import { useConversationStream } from '../../../hooks/use_conversation_stream';

jest.mock('./round_input', () => ({
  RoundInput: () => null,
}));

jest.mock('./round_response/round_response', () => ({
  RoundResponse: jest.fn(() => null),
}));

jest.mock('./round_error/round_error', () => ({
  RoundError: () => null,
}));

jest.mock('./round_prompt', () => ({
  ConfirmationPrompt: jest.fn(() => null),
}));

jest.mock('./round_attachment_references', () => ({
  RoundAttachmentReferences: () => null,
}));

jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));

const useConversationStreamMock = useConversationStream as jest.MockedFunction<
  typeof useConversationStream
>;
const roundResponseMock = RoundResponse as jest.MockedFunction<typeof RoundResponse>;
const { ConfirmationPrompt: ConfirmationPromptMock } = jest.requireMock('./round_prompt');

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
        scrollContainerHeight={100}
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
        scrollContainerHeight={100}
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
        scrollContainerHeight={100}
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
        scrollContainerHeight={100}
      />
    );

    expect(roundResponseMock.mock.calls[1][0].attachmentRefs).not.toBe(firstAttachmentRefs);
    expect(roundResponseMock.mock.calls[1][0].attachmentRefs).toEqual([
      { attachment_id: 'attachment-1', version: 2 },
    ]);
  });

  it('keeps HITL confirmation buttons enabled as soon as the round reaches awaitingPrompt, even while the stream is still closing', () => {
    const awaitingPromptRound: ConversationRound = {
      id: 'round-2',
      status: ConversationRoundStatus.awaitingPrompt,
      input: { message: 'run scan' },
      response: { message: 'Run malware scan?' },
      steps: [],
      pending_prompts: [
        {
          id: 'prompt-1',
          type: AgentPromptType.confirmation,
          title: 'Run malware scan?',
          message: 'Scan /tmp for malware?',
          confirm_text: 'Run scan',
          cancel_text: 'Deny',
        },
      ],
      started_at: '2026-01-01T00:00:00.000Z',
      time_to_first_token: 1,
      time_to_last_token: 1,
      model_usage: {
        connector_id: 'connector-1',
        llm_calls: 1,
        input_tokens: 1,
        output_tokens: 1,
      },
    } as unknown as ConversationRound;

    useConversationStreamMock.mockReturnValue({
      sendMessage: jest.fn(),
      isResponseLoading: false,
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

    render(
      <RoundLayout
        allRounds={[awaitingPromptRound]}
        conversationId="conversation-1"
        isCurrentRound={true}
        rawRound={awaitingPromptRound}
        roundIndex={0}
        scrollContainerHeight={100}
      />
    );

    const lastCall = ConfirmationPromptMock.mock.calls.at(-1)[0];
    expect(lastCall.isDisabled).toBe(false);
  });
});

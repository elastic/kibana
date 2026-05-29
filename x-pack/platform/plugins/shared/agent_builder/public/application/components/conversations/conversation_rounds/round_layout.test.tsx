/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ConversationRoundStatus, type ConversationRound } from '@kbn/agent-builder-common';
import { RoundLayout } from './round_layout';
import { RoundResponse } from './round_response/round_response';
import { useSendMessage } from '../../../context/send_message/send_message_context';

jest.mock('./round_input', () => ({
  RoundInput: () => null,
}));

jest.mock('./round_thinking/round_thinking', () => ({
  RoundThinking: () => null,
}));

jest.mock('./round_response/round_response', () => ({
  RoundResponse: jest.fn(() => null),
}));

jest.mock('./round_error/round_error', () => ({
  RoundError: () => null,
}));

jest.mock('./round_prompt', () => ({
  ConfirmationPrompt: () => null,
}));

jest.mock('./round_attachment_references', () => ({
  RoundAttachmentReferences: () => null,
}));

jest.mock('../../../context/send_message/send_message_context', () => ({
  useSendMessage: jest.fn(),
}));

const useSendMessageMock = useSendMessage as jest.MockedFunction<typeof useSendMessage>;
const roundResponseMock = RoundResponse as jest.MockedFunction<typeof RoundResponse>;

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
    useSendMessageMock.mockReturnValue({
      sendMessage: jest.fn(),
      isResponseLoading: false,
      pendingMessage: undefined,
      error: null,
      errorSteps: [],
      agentReasoning: null,
      retry: jest.fn(),
      canCancel: false,
      cancel: jest.fn(),
      cleanConversation: jest.fn(),
      removeError: jest.fn(),
      resumeRound: jest.fn(),
      isResuming: false,
      regenerate: jest.fn(),
      isRegenerating: false,
      connectorSelection: {
        selectedConnector: undefined,
        selectConnector: jest.fn(),
        defaultConnectorOnly: false,
      },
    } as ReturnType<typeof useSendMessage>);
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
});

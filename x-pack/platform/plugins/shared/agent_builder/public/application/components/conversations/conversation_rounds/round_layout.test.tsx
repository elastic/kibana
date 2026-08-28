/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  ConversationOriginType,
  ConversationRoundStatus,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import { RoundLayout } from './round_layout';
import { RoundInput } from './round_input';
import { RoundResponse } from './round_response/round_response';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useCurrentUser } from '../../../hooks/agents/use_current_user';
import { pendingRoundId } from '../../../utils/new_conversation';

jest.mock('./round_input', () => ({
  RoundInput: jest.fn(() => null),
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

jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));

jest.mock('../../../hooks/agents/use_current_user', () => ({
  useCurrentUser: jest.fn(),
}));

const useConversationStreamMock = useConversationStream as jest.MockedFunction<
  typeof useConversationStream
>;
const roundInputMock = RoundInput as jest.MockedFunction<typeof RoundInput>;
const roundResponseMock = RoundResponse as jest.MockedFunction<typeof RoundResponse>;
const useCurrentUserMock = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const currentUserProfile = {
  uid: 'current-user',
  enabled: true,
  user: {
    username: 'alice',
    full_name: 'Alice Maria',
  },
  data: {
    avatar: {
      initials: 'AM',
    },
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
    useCurrentUserMock.mockReturnValue({
      currentUser: {
        id: 'current-user',
        username: 'alice',
      },
      currentUserProfile,
      isLoading: false,
    });
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
        scrollContainerHeight={100}
      />
    );

    const roundInputProps = roundInputMock.mock.calls[0][0];
    expect(roundInputProps).toEqual(
      expect.objectContaining({
        author: round.author,
        origin: round.origin,
        startedAt: round.started_at,
      })
    );
    expect(roundInputProps).not.toHaveProperty('authorProfile');
    expect(roundResponseMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        startedAt: round.started_at,
      })
    );
  });

  it('uses the current user profile for local pending rounds without persisted author attribution', () => {
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
        scrollContainerHeight={100}
      />
    );

    expect(roundInputMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        author: currentUserProfile,
        isCurrentUser: true,
      })
    );
  });

  it('marks the input as current user when the author matches the authenticated user', () => {
    const round = {
      ...createRound(1),
      author: {
        id: 'current-user',
        username: 'alice',
      },
    };

    render(
      <RoundLayout
        allRounds={[round]}
        conversationId="conversation-1"
        isCurrentRound={false}
        rawRound={round}
        roundIndex={0}
        scrollContainerHeight={100}
      />
    );

    expect(roundInputMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        isCurrentUser: true,
      })
    );
  });

  it('marks the input as another user when the author differs from the authenticated user', () => {
    const round = {
      ...createRound(1),
      author: {
        id: 'other-user',
        username: 'elastic',
      },
    };

    render(
      <RoundLayout
        allRounds={[round]}
        conversationId="conversation-1"
        isCurrentRound={false}
        rawRound={round}
        roundIndex={0}
        scrollContainerHeight={100}
      />
    );

    expect(roundInputMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        isCurrentUser: false,
      })
    );
  });
});

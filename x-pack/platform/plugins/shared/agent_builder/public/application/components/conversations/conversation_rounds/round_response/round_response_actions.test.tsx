/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import copy from 'copy-to-clipboard';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import { RoundResponseActions } from './round_response_actions';
import { useToasts } from '../../../../hooks/use_toasts';
import { useConversationReadOnly } from '../../../../hooks/use_conversation';

jest.mock('copy-to-clipboard');

jest.mock('../../../../hooks/use_toasts', () => ({
  useToasts: jest.fn(),
}));

jest.mock('../../../../hooks/use_conversation_stream', () => ({
  useConversationStream: () => ({
    regenerate: jest.fn(),
    isRegenerating: false,
    isResponseLoading: false,
  }),
}));

jest.mock('../../../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { plugins: {} } }),
}));

jest.mock('../../../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: () => false,
}));

jest.mock('../../../../hooks/use_tracing_enabled', () => ({
  useTracingEnabled: () => false,
}));

jest.mock('../../../../hooks/use_conversation', () => ({
  useAgentId: () => undefined,
  useConversationReadOnly: jest.fn(),
}));

jest.mock('./feedback_controls/use_feedback', () => ({
  useFeedback: () => ({
    vote: null,
    chips: [],
    comment: '',
    modalOpen: false,
    inviteVisible: false,
    submitted: false,
    submittedFading: false,
    isSubmitting: false,
    setVote: jest.fn(),
    toggleChip: jest.fn(),
    setComment: jest.fn(),
    openModal: jest.fn(),
    closeModal: jest.fn(),
    dismissInvite: jest.fn(),
    submit: jest.fn(),
  }),
}));

const copyMock = copy as jest.MockedFunction<typeof copy>;
const useToastsMock = useToasts as jest.MockedFunction<typeof useToasts>;
const useConversationReadOnlyMock = jest.mocked(useConversationReadOnly);
const addSuccessToast = jest.fn();

const createCompletedRound = (): ConversationRound =>
  ({
    id: 'round-1',
    status: ConversationRoundStatus.completed,
    input: { message: 'hello' },
    steps: [],
    response: { message: 'hi' },
  } as unknown as ConversationRound);

describe('RoundResponseActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    copyMock.mockReturnValue(true);
    useToastsMock.mockReturnValue({ addSuccessToast } as unknown as ReturnType<typeof useToasts>);
    useConversationReadOnlyMock.mockReturnValue({ isReadOnly: false, isLoading: false });
  });

  it('labels the copy action for the agent response by default', async () => {
    render(<RoundResponseActions content="the answer" isVisible />);

    const copyButton = screen.getByRole('button', { name: 'Copy response' });
    await userEvent.click(copyButton);

    expect(copyMock).toHaveBeenCalledWith('the answer');
    expect(addSuccessToast).toHaveBeenCalledWith('Response copied to clipboard');
  });

  it('labels the copy action for the user prompt when copyTarget is prompt', async () => {
    render(<RoundResponseActions content="my question" isVisible copyTarget="prompt" />);

    const copyButton = screen.getByRole('button', { name: 'Copy prompt' });
    await userEvent.click(copyButton);

    expect(copyMock).toHaveBeenCalledWith('my question');
    expect(addSuccessToast).toHaveBeenCalledWith('Prompt copied to clipboard');
  });

  it('hides the regenerate action for read-only conversations while keeping copy available', () => {
    useConversationReadOnlyMock.mockReturnValue({ isReadOnly: true, isLoading: false });

    render(<RoundResponseActions content="the answer" isVisible isLastRound />);

    expect(screen.getByRole('button', { name: 'Copy response' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Regenerate response' })).not.toBeInTheDocument();
  });

  it('hides the regenerate action while read-only state is loading', () => {
    useConversationReadOnlyMock.mockReturnValue({ isReadOnly: false, isLoading: true });

    render(<RoundResponseActions content="the answer" isVisible isLastRound />);

    expect(screen.queryByRole('button', { name: 'Regenerate response' })).not.toBeInTheDocument();
  });

  // Round feedback is temporarily hidden while it isn't modelled in the events
  // timeline (see ROUND_FEEDBACK_ENABLED in round_response_actions.tsx): a vote
  // can't survive the events->rounds projection yet. It stays hidden even for a
  // completed, editable round — the case that previously rendered the controls.
  // TODO(agent-builder): when feedback is re-enabled, restore the read-only /
  // loading gating coverage that used to live here.
  it('does not render the feedback actions while feedback is disabled', () => {
    render(
      <RoundResponseActions content="the answer" isVisible rawRound={createCompletedRound()} />
    );

    expect(screen.queryByRole('button', { name: 'Good response' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bad response' })).not.toBeInTheDocument();
  });
});

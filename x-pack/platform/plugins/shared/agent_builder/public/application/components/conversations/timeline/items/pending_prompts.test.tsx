/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { PendingPrompts } from './pending_prompts';

const mockResumeRound = jest.fn();
const mockStream = { isResuming: false };

jest.mock('../../../../hooks/use_conversation_stream', () => ({
  useConversationStream: () => ({
    resumeRound: mockResumeRound,
    isResuming: mockStream.isResuming,
  }),
}));

// Stub the prompt components so the test targets PendingPrompts' aggregation, not each prompt's UI.
// Each stub exposes the callbacks PendingPrompts wires up, keyed by prompt id.
jest.mock('../prompts', () => ({
  ConfirmationPrompt: ({ prompt, onConfirm, onCancel, isDisabled }: any) => (
    <div>
      <button data-test-subj={`confirm-${prompt.id}`} disabled={isDisabled} onClick={onConfirm}>
        confirm
      </button>
      <button data-test-subj={`deny-${prompt.id}`} disabled={isDisabled} onClick={onCancel}>
        deny
      </button>
    </div>
  ),
  AuthorizationPrompt: ({ prompt, onAuthorize, onCancel, isDisabled }: any) => (
    <div>
      <button data-test-subj={`authorize-${prompt.id}`} disabled={isDisabled} onClick={onAuthorize}>
        authorize
      </button>
      <button data-test-subj={`decline-${prompt.id}`} disabled={isDisabled} onClick={onCancel}>
        decline
      </button>
    </div>
  ),
  AskUserQuestionPrompt: ({ promptId, onSubmit, isDisabled }: any) => (
    <button
      data-test-subj={`submit-${promptId}`}
      disabled={isDisabled}
      onClick={() => onSubmit({ answers: [{ choice: [0] }] })}
    >
      submit
    </button>
  ),
}));

const PROMPT_REQUESTED_EVENT_ID = 'round-1::execution_terminated';

const confirmation = (id: string): PromptRequest => ({ id, type: AgentPromptType.confirmation });
const authorization = (id: string): PromptRequest =>
  ({
    id,
    type: AgentPromptType.authorization,
    connector_id: 'c',
    connector_name: 'C',
    connector_type: 't',
    auth_method: 'oauth_authorization_code',
  } as PromptRequest);
const question = (id: string): PromptRequest => ({
  id,
  type: AgentPromptType.ask_user_question,
  questions: [],
});

const renderPrompts = (prompts: PromptRequest[]) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <PendingPrompts prompts={prompts} promptRequestedEventId={PROMPT_REQUESTED_EVENT_ID} />
      </EuiProvider>
    </I18nProvider>
  );

describe('PendingPrompts', () => {
  beforeEach(() => {
    mockResumeRound.mockClear();
    mockStream.isResuming = false;
  });

  it('resumes with allow=true when a confirmation is approved', () => {
    renderPrompts([confirmation('c1')]);

    fireEvent.click(screen.getByTestId('confirm-c1'));

    expect(mockResumeRound).toHaveBeenCalledTimes(1);
    expect(mockResumeRound).toHaveBeenCalledWith({
      prompts: { c1: { allow: true } },
      promptRequestedEventId: PROMPT_REQUESTED_EVENT_ID,
    });
  });

  it('resumes with allow=false when a confirmation is denied', () => {
    renderPrompts([confirmation('c1')]);

    fireEvent.click(screen.getByTestId('deny-c1'));

    expect(mockResumeRound).toHaveBeenCalledWith({
      prompts: { c1: { allow: false } },
      promptRequestedEventId: PROMPT_REQUESTED_EVENT_ID,
    });
  });

  it('resumes with authorized=true when an authorization is granted', () => {
    renderPrompts([authorization('a1')]);

    fireEvent.click(screen.getByTestId('authorize-a1'));

    expect(mockResumeRound).toHaveBeenCalledWith({
      prompts: { a1: { authorized: true } },
      promptRequestedEventId: PROMPT_REQUESTED_EVENT_ID,
    });
  });

  it('resumes with the answers when a question is submitted', () => {
    renderPrompts([question('q1')]);

    fireEvent.click(screen.getByTestId('submit-q1'));

    expect(mockResumeRound).toHaveBeenCalledWith({
      prompts: { q1: { answers: [{ choice: [0] }] } },
      promptRequestedEventId: PROMPT_REQUESTED_EVENT_ID,
    });
  });

  it('waits for every prompt before resuming, then sends all answers once', () => {
    renderPrompts([confirmation('c1'), question('q1')]);

    fireEvent.click(screen.getByTestId('confirm-c1'));
    expect(mockResumeRound).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('submit-q1'));
    expect(mockResumeRound).toHaveBeenCalledTimes(1);
    expect(mockResumeRound).toHaveBeenCalledWith({
      prompts: { c1: { allow: true }, q1: { answers: [{ choice: [0] }] } },
      promptRequestedEventId: PROMPT_REQUESTED_EVENT_ID,
    });
  });

  it('disables the controls while a resume is in flight', () => {
    mockStream.isResuming = true;
    renderPrompts([confirmation('c1')]);

    expect(screen.getByTestId('confirm-c1')).toBeDisabled();
    expect(screen.getByTestId('deny-c1')).toBeDisabled();
  });
});

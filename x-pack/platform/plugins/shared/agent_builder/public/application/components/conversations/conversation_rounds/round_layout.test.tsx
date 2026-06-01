/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import { ConversationRoundStatus, ConversationRoundStepType } from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import type { ConfirmationPrompt, FormPromptRequest } from '@kbn/agent-builder-common/agents';
import '@testing-library/jest-dom';
import { RoundLayout } from './round_layout';
import { useConversationStream } from '../../../hooks/use_conversation_stream';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

// === Mocked child components ===

jest.mock('./round_input', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    RoundInput: jest.fn(({ input }: { input: string }) =>
      _React.createElement('div', { 'data-test-subj': 'round-input', 'data-input': input })
    ),
  };
});

jest.mock('./round_thinking/round_thinking', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    RoundThinking: jest.fn(
      ({ isAwaitingPrompt, isLoading }: { isAwaitingPrompt: boolean; isLoading: boolean }) =>
        _React.createElement('div', {
          'data-is-awaiting-prompt': String(isAwaitingPrompt),
          'data-is-loading': String(isLoading),
          'data-test-subj': 'round-thinking',
        })
    ),
  };
});

jest.mock('./round_response/round_response', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    RoundResponse: jest.fn(({ attachmentRefs }: { attachmentRefs?: unknown[] }) =>
      _React.createElement('div', {
        'data-test-subj': 'round-response',
        'data-attachment-refs-count': attachmentRefs ? String(attachmentRefs.length) : '0',
      })
    ),
  };
});

jest.mock('./round_error/round_error', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    RoundError: jest.fn(({ onRetry }: { onRetry: () => void }) =>
      _React.createElement('div', { 'data-test-subj': 'round-error', onClick: onRetry })
    ),
  };
});

jest.mock('./round_prompt', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    ConfirmationPrompt: jest.fn(
      ({
        onCancel,
        onConfirm,
        prompt,
      }: {
        onCancel: () => void;
        onConfirm: () => void;
        prompt: { id: string };
      }) =>
        _React.createElement(
          'div',
          { 'data-test-subj': `confirmation-prompt-${prompt.id}` },
          _React.createElement(
            'button',
            { 'data-test-subj': `confirm-${prompt.id}`, onClick: onConfirm },
            'confirm'
          ),
          _React.createElement(
            'button',
            { 'data-test-subj': `cancel-${prompt.id}`, onClick: onCancel },
            'cancel'
          )
        )
    ),
    FormPrompt: jest.fn(
      ({
        isAnswered,
        onSubmit,
        prompt,
      }: {
        isAnswered?: boolean;
        onSubmit: (r: unknown) => void;
        prompt: { execution_id: string; id: string };
      }) =>
        _React.createElement(
          'div',
          {
            'data-is-answered': String(isAnswered ?? false),
            'data-test-subj': `form-prompt-${prompt.id}`,
          },
          _React.createElement(
            'button',
            {
              'data-test-subj': `submit-form-${prompt.id}`,
              onClick: () =>
                onSubmit({ execution_id: prompt.execution_id, id: prompt.id, values: {} }),
            },
            'submit'
          )
        )
    ),
  };
});

jest.mock('./round_attachment_references', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    RoundAttachmentReferences: jest.fn(() =>
      _React.createElement('div', { 'data-test-subj': 'round-attachment-references' })
    ),
  };
});

jest.mock('./todos_step_display', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _React = require('react');
  return {
    TodosStepDisplay: jest.fn(() =>
      _React.createElement('div', { 'data-test-subj': 'todos-step-display' })
    ),
  };
});

// === Mocked hooks ===

jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));

jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: jest.fn(),
}));

// === Typed references ===

const mockUseConversationStream = useConversationStream as jest.MockedFunction<
  typeof useConversationStream
>;
const mockUseAgentBuilderServices = useAgentBuilderServices as jest.MockedFunction<
  typeof useAgentBuilderServices
>;

// === Shared mock setup ===

const mockResumeRound = jest.fn();
const mockRetry = jest.fn();

const defaultStreamValues = {
  agentReasoning: null,
  cancel: jest.fn(),
  canCancel: false,
  error: undefined,
  errorSteps: [] as ConversationRoundStep[],
  isRegenerating: false,
  isResponseLoading: false,
  isResuming: false,
  isStreaming: false,
  pendingMessage: undefined,
  regenerate: jest.fn(),
  removeError: jest.fn(),
  resumeRound: mockResumeRound,
  retry: mockRetry,
  sendMessage: jest.fn(),
};

// === Data factories ===

const makeConfirmationPrompt = (id: string): ConfirmationPrompt => ({
  id,
  type: AgentPromptType.confirmation,
});

const makeFormPrompt = (id: string): FormPromptRequest => ({
  execution_id: `exec-${id}`,
  id,
  message: 'Please fill',
  schema: {},
  step_execution_id: `step-${id}`,
  type: AgentPromptType.form,
});

const makeHitlFreshStep = (
  stepExecutionId: string,
  overrides: Partial<{
    execution_id: string;
    message: string;
    schema: Record<string, unknown>;
    submitted_at: string;
    values: Record<string, unknown>;
  }> = {}
): ConversationRoundStep =>
  ({
    execution_id: 'exec-1',
    kind: 'hitl_form_response',
    message: 'Please approve',
    schema: { type: 'object', properties: { approved: { type: 'boolean' } } },
    step_execution_id: stepExecutionId,
    submitted_at: '2024-01-01T00:01:00Z',
    type: ConversationRoundStepType.other,
    values: { approved: true },
    ...overrides,
  } as unknown as ConversationRoundStep);

const makeHitlStaleStep = (
  stepExecutionId: string,
  overrides: Partial<{
    execution_id: string;
    message: string;
    schema: Record<string, unknown>;
    submitted_at: string;
    submitted_values: Record<string, unknown>;
  }> = {}
): ConversationRoundStep =>
  ({
    execution_id: 'exec-1',
    kind: 'hitl_form_response_stale',
    message: 'Please approve',
    observed_status: 'COMPLETED',
    reason: 'workflow_already_resolved',
    schema: { type: 'object', properties: { approved: { type: 'boolean' } } },
    step_execution_id: stepExecutionId,
    submitted_at: '2024-01-01T00:01:00Z',
    submitted_values: { approved: true },
    type: ConversationRoundStepType.other,
    ...overrides,
  } as unknown as ConversationRoundStep);

const makeTodosStep = (): ConversationRoundStep =>
  ({
    carried_over: false,
    todos: [{ description: 'do something', id: 'todo-1', status: 'pending' as const }],
    type: ConversationRoundStepType.updateTodos,
  } as unknown as ConversationRoundStep);

const makeRound = (overrides: Partial<ConversationRound> = {}): ConversationRound =>
  ({
    id: 'round-1',
    input: { message: 'Hello agent' },
    model_usage: { connector_id: 'c1', llm_calls: 1 },
    response: { message: 'Hello user' },
    started_at: '2024-01-01T00:00:00Z',
    status: ConversationRoundStatus.completed,
    steps: [],
    time_to_first_token: 100,
    time_to_last_token: 200,
    ...overrides,
  } as unknown as ConversationRound);

const defaultProps = {
  allRounds: [makeRound()],
  conversationId: 'conv-1',
  isCurrentRound: true,
  rawRound: makeRound(),
  roundIndex: 0,
  scrollContainerHeight: 500,
};

const renderLayout = (
  props: Partial<typeof defaultProps> & {
    rawRound?: ConversationRound;
    allRounds?: ConversationRound[];
  } = {}
) =>
  render(
    <RoundLayout
      {...defaultProps}
      {...props}
      allRounds={props.allRounds ?? defaultProps.allRounds}
      rawRound={props.rawRound ?? defaultProps.rawRound}
    />
  );

// === Test suite ===

describe('RoundLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConversationStream.mockReturnValue(defaultStreamValues);
    mockUseAgentBuilderServices.mockReturnValue({
      inboxEnabled: false,
    } as ReturnType<typeof useAgentBuilderServices>);
  });

  describe('RoundInput', () => {
    it('renders RoundInput with the round input message', () => {
      const round = makeRound({ input: { message: 'What is the weather?' } });

      renderLayout({ rawRound: round });

      const roundInput = screen.getByTestId('round-input');
      expect(roundInput).toBeInTheDocument();
      expect(roundInput).toHaveAttribute('data-input', 'What is the weather?');
    });
  });

  describe('RoundThinking / RoundError', () => {
    it('renders RoundThinking (not RoundError) when there is no error', () => {
      renderLayout();

      expect(screen.getByTestId('round-thinking')).toBeInTheDocument();
      expect(screen.queryByTestId('round-error')).not.toBeInTheDocument();
    });

    it('renders RoundThinking with isLoading=true while the current round is loading', () => {
      mockUseConversationStream.mockReturnValue({
        ...defaultStreamValues,
        isResponseLoading: true,
      });

      renderLayout({ isCurrentRound: true });

      expect(screen.getByTestId('round-thinking')).toHaveAttribute('data-is-loading', 'true');
    });

    it('renders RoundError (not RoundThinking) when there is an error on the current round', () => {
      mockUseConversationStream.mockReturnValue({
        ...defaultStreamValues,
        error: new Error('oops'),
      });

      renderLayout({ isCurrentRound: true });

      expect(screen.getByTestId('round-error')).toBeInTheDocument();
      expect(screen.queryByTestId('round-thinking')).not.toBeInTheDocument();
    });

    it('wires the retry callback to RoundError', () => {
      mockUseConversationStream.mockReturnValue({
        ...defaultStreamValues,
        error: new Error('oops'),
      });

      renderLayout({ isCurrentRound: true });

      fireEvent.click(screen.getByTestId('round-error'));

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('does not show RoundError when error occurs on a non-current round', () => {
      mockUseConversationStream.mockReturnValue({
        ...defaultStreamValues,
        error: new Error('oops'),
      });

      renderLayout({ isCurrentRound: false });

      expect(screen.queryByTestId('round-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('round-thinking')).toBeInTheDocument();
    });
  });

  describe('TodosStepDisplay', () => {
    it('renders TodosStepDisplay when the round has a todos step', () => {
      const round = makeRound({ steps: [makeTodosStep()] });

      renderLayout({ rawRound: round });

      expect(screen.getByTestId('todos-step-display')).toBeInTheDocument();
    });

    it('does not render TodosStepDisplay when the round has no todos step', () => {
      renderLayout();

      expect(screen.queryByTestId('todos-step-display')).not.toBeInTheDocument();
    });
  });

  describe('RoundThinking props when awaiting prompt', () => {
    it('passes isAwaitingPrompt=true and isLoading=false to RoundThinking when the round is awaiting a prompt', () => {
      const round = makeRound({
        pending_prompts: [makeConfirmationPrompt('p1')],
        status: ConversationRoundStatus.awaitingPrompt,
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      const thinking = screen.getByTestId('round-thinking');
      expect(thinking).toHaveAttribute('data-is-awaiting-prompt', 'true');
      expect(thinking).toHaveAttribute('data-is-loading', 'false');
    });
  });

  describe('Confirmation prompts', () => {
    it('renders one ConfirmationPrompt per confirmation prompt when awaiting', () => {
      const round = makeRound({
        pending_prompts: [makeConfirmationPrompt('p1'), makeConfirmationPrompt('p2')],
        status: ConversationRoundStatus.awaitingPrompt,
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      expect(screen.getByTestId('confirmation-prompt-p1')).toBeInTheDocument();
      expect(screen.getByTestId('confirmation-prompt-p2')).toBeInTheDocument();
    });

    it('does not render ConfirmationPrompt when not awaiting a prompt', () => {
      const round = makeRound({
        pending_prompts: [makeConfirmationPrompt('p1')],
        status: ConversationRoundStatus.completed,
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      expect(screen.queryByTestId('confirmation-prompt-p1')).not.toBeInTheDocument();
    });

    it('calls resumeRound only after all confirmation prompts are answered', () => {
      const round = makeRound({
        pending_prompts: [makeConfirmationPrompt('p1'), makeConfirmationPrompt('p2')],
        status: ConversationRoundStatus.awaitingPrompt,
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      // Answer first prompt — resumeRound must NOT yet fire
      fireEvent.click(screen.getByTestId('confirm-p1'));
      expect(mockResumeRound).not.toHaveBeenCalled();

      // Answer second prompt — now resumeRound fires
      fireEvent.click(screen.getByTestId('cancel-p2'));
      expect(mockResumeRound).toHaveBeenCalledTimes(1);
      expect(mockResumeRound).toHaveBeenCalledWith({
        prompts: { p1: { allow: true }, p2: { allow: false } },
      });
    });

    it('calls resumeRound immediately when there is only one confirmation prompt and it is answered', () => {
      const round = makeRound({
        pending_prompts: [makeConfirmationPrompt('p1')],
        status: ConversationRoundStatus.awaitingPrompt,
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      fireEvent.click(screen.getByTestId('confirm-p1'));

      expect(mockResumeRound).toHaveBeenCalledWith({
        prompts: { p1: { allow: true } },
      });
    });
  });

  describe('Form prompts (HITL inbox logic)', () => {
    it('does not render FormPrompt when inboxEnabled is false', () => {
      mockUseAgentBuilderServices.mockReturnValue({
        inboxEnabled: false,
      } as ReturnType<typeof useAgentBuilderServices>);

      const round = makeRound({
        pending_prompts: [makeFormPrompt('fp1')],
        status: ConversationRoundStatus.awaitingPrompt,
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      expect(screen.queryByTestId('form-prompt-fp1')).not.toBeInTheDocument();
    });

    it('renders one FormPrompt per form prompt when inboxEnabled is true and round is awaiting', () => {
      mockUseAgentBuilderServices.mockReturnValue({
        inboxEnabled: true,
      } as ReturnType<typeof useAgentBuilderServices>);

      const round = makeRound({
        pending_prompts: [makeFormPrompt('fp1'), makeFormPrompt('fp2')],
        status: ConversationRoundStatus.awaitingPrompt,
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      expect(screen.getByTestId('form-prompt-fp1')).toBeInTheDocument();
      expect(screen.getByTestId('form-prompt-fp2')).toBeInTheDocument();
    });

    it('does not render FormPrompt when isResuming is true (user already submitted)', () => {
      mockUseAgentBuilderServices.mockReturnValue({
        inboxEnabled: true,
      } as ReturnType<typeof useAgentBuilderServices>);
      mockUseConversationStream.mockReturnValue({
        ...defaultStreamValues,
        isResuming: true,
      });

      const round = makeRound({
        pending_prompts: [makeFormPrompt('fp1')],
        status: ConversationRoundStatus.awaitingPrompt,
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      expect(screen.queryByTestId('form-prompt-fp1')).not.toBeInTheDocument();
    });

    it('calls resumeRound with form_prompts payload when form is submitted', () => {
      mockUseAgentBuilderServices.mockReturnValue({
        inboxEnabled: true,
      } as ReturnType<typeof useAgentBuilderServices>);

      const round = makeRound({
        pending_prompts: [makeFormPrompt('fp1')],
        status: ConversationRoundStatus.awaitingPrompt,
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      fireEvent.click(screen.getByTestId('submit-form-fp1'));

      expect(mockResumeRound).toHaveBeenCalledWith({
        form_prompts: [{ execution_id: 'exec-fp1', id: 'fp1', values: {} }],
      });
    });
  });

  describe('RoundResponse and RoundAttachmentReferences visibility', () => {
    it('shows RoundResponse and RoundAttachmentReferences when not awaiting a prompt', () => {
      renderLayout();

      expect(screen.getByTestId('round-response')).toBeInTheDocument();
      expect(screen.getByTestId('round-attachment-references')).toBeInTheDocument();
    });

    it('shows RoundResponse and RoundAttachmentReferences above forms while awaiting a prompt', () => {
      const round = makeRound({
        pending_prompts: [makeConfirmationPrompt('p1')],
        status: ConversationRoundStatus.awaitingPrompt,
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      const response = screen.getByTestId('round-response');
      const attachmentRefs = screen.getByTestId('round-attachment-references');
      const confirmation = screen.getByTestId('confirmation-prompt-p1');

      expect(response).toBeInTheDocument();
      expect(attachmentRefs).toBeInTheDocument();
      // Prose renders before (above) the confirmation form in DOM order
      expect(response.compareDocumentPosition(confirmation)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('cumulativeAttachmentRefs', () => {
    it('passes cumulative attachment refs from all prior rounds to RoundResponse', () => {
      const ref1 = { attachment_id: 'att-1', version: 1 };
      const ref2 = { attachment_id: 'att-2', version: 1 };

      const round0 = makeRound({
        id: 'round-0',
        input: { attachment_refs: [ref1], message: 'hi' },
      });
      const round1 = makeRound({
        id: 'round-1',
        input: { attachment_refs: [ref2], message: 'follow up' },
      });

      renderLayout({
        allRounds: [round0, round1],
        rawRound: round1,
        roundIndex: 1,
      });

      // Both refs from rounds 0 and 1 must be passed
      const responseEl = screen.getByTestId('round-response');
      expect(responseEl).toHaveAttribute('data-attachment-refs-count', '2');
    });

    it('passes undefined attachmentRefs to RoundResponse when response has no message', () => {
      const round = makeRound({ response: { message: '' } });

      renderLayout({ rawRound: round });

      const responseEl = screen.getByTestId('round-response');
      expect(responseEl).toHaveAttribute('data-attachment-refs-count', '0');
    });

    it('deduplicates attachment refs and keeps highest version per attachment', () => {
      const refV1 = { attachment_id: 'att-1', version: 1 };
      const refV2 = { attachment_id: 'att-1', version: 2 };

      const round0 = makeRound({
        id: 'round-0',
        input: { attachment_refs: [refV1], message: 'hi' },
      });
      const round1 = makeRound({
        id: 'round-1',
        input: { attachment_refs: [refV2], message: 'update' },
      });

      renderLayout({
        allRounds: [round0, round1],
        rawRound: round1,
        roundIndex: 1,
      });

      // Only one unique attachment (deduplicated); highest version wins
      const responseEl = screen.getByTestId('round-response');
      expect(responseEl).toHaveAttribute('data-attachment-refs-count', '1');
    });
  });

  describe('mount / unmount', () => {
    it('mounts and unmounts without throwing', () => {
      const { unmount } = renderLayout();

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('submitted HITL form history (Bug B+C)', () => {
    beforeEach(() => {
      mockUseAgentBuilderServices.mockReturnValue({
        inboxEnabled: true,
      } as ReturnType<typeof useAgentBuilderServices>);
    });

    it('renders two history forms above one active form in chronological order', () => {
      const step1 = makeHitlFreshStep('step-1', { submitted_at: '2024-01-01T00:01:00Z' });
      const step2 = makeHitlFreshStep('step-2', { submitted_at: '2024-01-01T00:02:00Z' });
      const activePrompt = makeFormPrompt('step-3');

      const round = makeRound({
        pending_prompts: [activePrompt],
        status: ConversationRoundStatus.awaitingPrompt,
        steps: [step1, step2],
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      const forms = screen.getAllByTestId(/^form-prompt-/);

      expect(forms).toHaveLength(3);
      expect(forms[0].getAttribute('data-test-subj')).toBe('form-prompt-step-1');
      expect(forms[1].getAttribute('data-test-subj')).toBe('form-prompt-step-2');
      expect(forms[2].getAttribute('data-test-subj')).toBe('form-prompt-step-3');
    });

    it('marks history forms with isAnswered={true}', () => {
      const step1 = makeHitlFreshStep('step-1');

      const round = makeRound({
        status: ConversationRoundStatus.completed,
        steps: [step1],
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      const form = screen.getByTestId('form-prompt-step-1');

      expect(form.getAttribute('data-is-answered')).toBe('true');
    });

    it('renders history forms even when there are no active pending prompts', () => {
      const step1 = makeHitlFreshStep('step-1', { submitted_at: '2024-01-01T00:01:00Z' });
      const step2 = makeHitlFreshStep('step-2', { submitted_at: '2024-01-01T00:02:00Z' });

      const round = makeRound({
        status: ConversationRoundStatus.completed,
        steps: [step1, step2],
      });

      renderLayout({ isCurrentRound: false, rawRound: round });

      expect(screen.getByTestId('form-prompt-step-1')).toBeInTheDocument();
      expect(screen.getByTestId('form-prompt-step-2')).toBeInTheDocument();
    });

    it('renders stale history forms with a "not applied" badge', () => {
      const staleStep = makeHitlStaleStep('step-stale');

      const round = makeRound({
        status: ConversationRoundStatus.completed,
        steps: [staleStep],
      });

      renderLayout({ isCurrentRound: false, rawRound: round });

      expect(screen.getByTestId('hitl-stale-badge-step-stale')).toBeInTheDocument();
    });

    it('renders stale history form BEFORE the response message and BEFORE the active form (chronological order)', () => {
      // Chronological event order:
      //   1. User submits stale form for step 1 (audit step appended to round.steps)
      //   2. LLM emits response message acknowledging the conflict
      //   3. Active step-2 form prompt rendered for user input
      // The layout must reflect this order so the narrative context flows naturally.
      const staleStep = makeHitlStaleStep('step-stale');
      const activePrompt = makeFormPrompt('active-step');

      const round = makeRound({
        pending_prompts: [activePrompt],
        response: { message: 'Heads up: your earlier submission was not applied.' },
        status: ConversationRoundStatus.awaitingPrompt,
        steps: [staleStep],
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      const staleBadge = screen.getByTestId('hitl-stale-badge-step-stale');
      const response = screen.getByTestId('round-response');
      const activeForm = screen.getByTestId('form-prompt-active-step');

      // Stale badge must appear BEFORE the response in DOM order.
      expect(staleBadge.compareDocumentPosition(response)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      // Response must appear BEFORE the active form in DOM order.
      expect(response.compareDocumentPosition(activeForm)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('renders fresh history form AFTER the response message (chronological order)', () => {
      // Chronological event order for the stale-advance scenario (Round N+1):
      //   1. LLM emits narrative ("not applied… please confirm step-2")
      //   2. User submits step-2 form — fresh audit step appended to this round
      // The fresh form must appear AFTER the response so the narrative is not displaced.
      const freshStep = makeHitlFreshStep('step-fresh');

      const round = makeRound({
        response: { message: 'Your previous submission was not applied. Please confirm step 2.' },
        status: ConversationRoundStatus.completed,
        steps: [freshStep],
      });

      renderLayout({ isCurrentRound: false, rawRound: round });

      const freshForm = screen.getByTestId('form-prompt-step-fresh');
      const response = screen.getByTestId('round-response');

      // Fresh form must appear AFTER the response in DOM order.
      expect(response.compareDocumentPosition(freshForm)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('does not render history forms when inboxEnabled is false', () => {
      mockUseAgentBuilderServices.mockReturnValue({
        inboxEnabled: false,
      } as ReturnType<typeof useAgentBuilderServices>);

      const step1 = makeHitlFreshStep('step-1');
      const round = makeRound({
        status: ConversationRoundStatus.completed,
        steps: [step1],
      });

      renderLayout({ isCurrentRound: false, rawRound: round });

      expect(screen.queryByTestId('form-prompt-step-1')).not.toBeInTheDocument();
    });

    it('immediately shows submitted form as readonly when Submit is clicked (optimistic UI)', () => {
      const activePrompt = makeFormPrompt('step-opt');
      const round = makeRound({
        pending_prompts: [activePrompt],
        status: ConversationRoundStatus.awaitingPrompt,
        steps: [],
      });

      renderLayout({ isCurrentRound: true, rawRound: round });

      expect(screen.getByTestId('form-prompt-step-opt').getAttribute('data-is-answered')).toBe(
        'false'
      );

      fireEvent.click(screen.getByTestId('submit-form-step-opt'));

      expect(screen.getByTestId('form-prompt-step-opt').getAttribute('data-is-answered')).toBe(
        'true'
      );
    });

    it('removes optimistic form once server-confirmed history appears for the same step', () => {
      const activePrompt = makeFormPrompt('step-opt2');
      const round = makeRound({
        pending_prompts: [activePrompt],
        status: ConversationRoundStatus.awaitingPrompt,
        steps: [],
      });

      const { rerender } = renderLayout({ isCurrentRound: true, rawRound: round });

      fireEvent.click(screen.getByTestId('submit-form-step-opt2'));

      expect(screen.getAllByTestId('form-prompt-step-opt2')).toHaveLength(1);

      const confirmedRound = makeRound({
        status: ConversationRoundStatus.completed,
        steps: [makeHitlFreshStep('step-opt2')],
      });

      rerender(<RoundLayout {...defaultProps} isCurrentRound={false} rawRound={confirmedRound} />);

      expect(screen.getAllByTestId('form-prompt-step-opt2')).toHaveLength(1);
    });
  });
});

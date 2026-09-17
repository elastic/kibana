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
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import { createToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ConfirmationPrompt } from '@kbn/agent-builder-common/agents';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import {
  createExecutionTerminatedEvent,
  createPromptRequestedTerminatedEvent,
} from './items/execution_terminated_event.factory';
import { createAwaitingPromptTurnItem } from './items/timeline_item.factory';
import {
  createAskUserQuestionPrompt,
  createAuthorizationPrompt,
} from './items/prompt_request_event.factory';
import { createPromptResponseEvent } from './items/prompt_response_event.factory';
import { createExecutionStepEvent } from './items/execution_step.factory';
import type { TimelineItem } from './to_timeline_items';
import { activeExecutionToItem, buildSavedItems, toTimelineItems } from './to_timeline_items';
import { Timeline } from './timeline';

jest.mock('../conversation_rounds/round_response/response_message', () => ({
  ResponseMessage: ({ isLoading }: { isLoading: boolean }) => (
    <div data-test-subj="response">{isLoading ? 'loading' : 'done'}</div>
  ),
}));

const steps = [
  createToolCallStep({ tool_call_id: 'tc-1', tool_id: 'search', params: {}, results: [] }),
  createToolCallStep({ tool_call_id: 'tc-2', tool_id: 'read', params: {}, results: [] }),
];
const executionId = 'round-1::execution';

const running: TimelineItem = {
  kind: 'agentTurn',
  key: executionId,
  executionId,
  status: 'running',
  startedAt: '2026-01-01T00:00:00.000Z',
  steps,
  response: { message: 'Hel' },
};
const terminal = createExecutionTerminatedEvent({ execution_id: executionId });
const completedLive: TimelineItem = {
  ...running,
  status: 'completed',
  terminal,
  response: undefined,
};
const completedSaved: TimelineItem = { ...completedLive, steps: [...steps] };

type TimelineProps = React.ComponentProps<typeof Timeline>;

const renderTimeline = (
  item: TimelineItem | TimelineItem[],
  props?: Omit<TimelineProps, 'items'>
) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <Timeline items={Array.isArray(item) ? item : [item]} {...props} />
      </EuiProvider>
    </I18nProvider>
  );

const createConfirmation = (id: string): ConfirmationPrompt => ({
  type: AgentPromptType.confirmation,
  id,
  title: `Confirm ${id}`,
});

describe('AgentTurn', () => {
  it('keeps an expanded tool group open through completion and the saved replacement', () => {
    const { rerender } = renderTimeline(running);
    expect(screen.queryByTestId('agentBuilderToolCallStep')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByTestId('agentBuilderToolCallStep')).toHaveLength(2);
    expect(screen.getByTestId('response')).toHaveTextContent('loading');

    rerender(
      <I18nProvider>
        <EuiProvider>
          <Timeline items={[completedLive]} />
        </EuiProvider>
      </I18nProvider>
    );
    expect(screen.getAllByTestId('agentBuilderToolCallStep')).toHaveLength(2);
    expect(screen.getByTestId('response')).toHaveTextContent('done');

    rerender(
      <I18nProvider>
        <EuiProvider>
          <Timeline items={[completedSaved]} />
        </EuiProvider>
      </I18nProvider>
    );
    expect(screen.getAllByTestId('agentBuilderToolCallStep')).toHaveLength(2);
  });
});

describe('AgentTurn - awaiting prompt', () => {
  it('renders the pending prompts of a paused turn', () => {
    renderTimeline(createAwaitingPromptTurnItem(), { onResumePrompt: jest.fn() });

    expect(screen.getByTestId('agentBuilderConfirmationPrompt')).toBeInTheDocument();
    expect(screen.queryByTestId('response')).not.toBeInTheDocument();
  });

  it('keeps the steps that led up to the pause visible above the prompt', () => {
    renderTimeline(createAwaitingPromptTurnItem(), { onResumePrompt: jest.fn() });

    expect(screen.getByTestId('agentBuilderToolCallStep')).toBeInTheDocument();
    expect(screen.getByTestId('agentBuilderConfirmationPrompt')).toBeInTheDocument();
  });

  it('disables the prompt controls until the terminal event supplies the join id', () => {
    renderTimeline(createAwaitingPromptTurnItem({ terminal: undefined }), {
      onResumePrompt: jest.fn(),
    });

    expect(screen.getByTestId('agentBuilderConfirmationPromptConfirmButton')).toBeDisabled();
  });

  it('resumes only once every pending prompt has an answer', () => {
    const onResumePrompt = jest.fn();
    renderTimeline(
      createAwaitingPromptTurnItem({
        pendingPrompts: [createConfirmation('prompt-1'), createConfirmation('prompt-2')],
      }),
      { onResumePrompt }
    );

    fireEvent.click(screen.getAllByTestId('agentBuilderConfirmationPromptConfirmButton')[0]);
    expect(onResumePrompt).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByTestId('agentBuilderConfirmationPromptCancelButton')[1]);
    expect(onResumePrompt).toHaveBeenCalledWith({
      prompts: { 'prompt-1': { allow: true }, 'prompt-2': { allow: false } },
      promptRequestedEventId: 'term-awaiting-1',
    });
  });

  it('renders the prompts of a paused turn rebuilt from saved events', () => {
    const [item] = buildSavedItems([
      createPromptRequestedTerminatedEvent({ id: 'term-paused', execution_id: executionId }),
    ]);

    renderTimeline(item, { onResumePrompt: jest.fn() });

    expect(screen.getByTestId('agentBuilderConfirmationPrompt')).toBeInTheDocument();
  });

  it('renders the prompts of a sealed live draft', () => {
    const item = activeExecutionToItem({
      status: 'completed',
      steps: [],
      message: '',
      executionId,
      terminalEvent: createPromptRequestedTerminatedEvent({
        id: 'term-paused',
        execution_id: executionId,
      }),
    });

    renderTimeline(item, { onResumePrompt: jest.fn() });

    expect(screen.getByTestId('agentBuilderConfirmationPrompt')).toBeInTheDocument();
  });

  it('passes the paused execution terminal event id back with the answers', () => {
    const onResumePrompt = jest.fn();
    const [item] = buildSavedItems([
      createPromptRequestedTerminatedEvent({ id: 'term-paused', execution_id: executionId }),
    ]);

    renderTimeline(item, { onResumePrompt });
    fireEvent.click(screen.getByTestId('agentBuilderConfirmationPromptConfirmButton'));

    expect(onResumePrompt).toHaveBeenCalledWith({
      prompts: { 'prompt-confirmation-1': { allow: true } },
      promptRequestedEventId: 'term-paused',
    });
  });

  it('stops offering a prompt once the pause has a saved answer', () => {
    const [item] = buildSavedItems([
      createPromptRequestedTerminatedEvent({ id: 'term-paused', execution_id: executionId }),
      createPromptResponseEvent({
        id: 'response-1',
        data: {
          prompt_requested_event_id: 'term-paused',
          responses: { 'prompt-confirmation-1': { allow: true } },
        },
      }),
    ]);

    renderTimeline(item, { onResumePrompt: jest.fn() });

    expect(screen.queryByTestId('agentBuilderConfirmationPrompt')).not.toBeInTheDocument();
  });

  it('stops offering a prompt once the draft records the answer locally', () => {
    const terminalEvent = createPromptRequestedTerminatedEvent({
      id: 'term-paused',
      execution_id: executionId,
    });
    const item = activeExecutionToItem({
      status: 'completed',
      steps: [],
      message: '',
      executionId,
      terminalEvent,
      promptResponse: createPromptResponseEvent({
        data: {
          prompt_requested_event_id: 'term-paused',
          responses: { 'prompt-confirmation-1': { allow: true } },
        },
      }),
    });

    renderTimeline(item, { onResumePrompt: jest.fn() });

    expect(screen.queryByTestId('agentBuilderConfirmationPrompt')).not.toBeInTheDocument();
  });

  it.each([
    { source: 'saved', accepted: true },
    { source: 'saved', accepted: false },
    { source: 'optimistic', accepted: true },
    { source: 'optimistic', accepted: false },
  ])(
    'hides $source confirmation and authorization answers (accepted: $accepted)',
    ({ source, accepted }) => {
      const confirmation = createConfirmation('confirmation-1');
      const authorization = createAuthorizationPrompt();
      const terminalEvent = createPromptRequestedTerminatedEvent({
        id: 'term-paused',
        execution_id: executionId,
        prompts: [confirmation, authorization],
      });
      const promptResponse = createPromptResponseEvent({
        id: 'response-1',
        data: {
          prompt_requested_event_id: terminalEvent.id,
          responses: {
            [confirmation.id]: { allow: accepted },
            [authorization.id]: { authorized: accepted },
          },
        },
      });
      const items =
        source === 'saved'
          ? buildSavedItems([terminalEvent, promptResponse])
          : toTimelineItems({
              events: [terminalEvent],
              activeExecution: {
                status: 'running',
                executionId: 'exec-resumed',
                steps: [],
                message: '',
                promptResponse,
              },
            });

      const { container } = renderTimeline(items);

      expect(screen.queryByTestId('agentBuilderConfirmationPrompt')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderAuthorizationPrompt')).not.toBeInTheDocument();
      expect(screen.queryByTestId('agentBuilderPromptResponse')).not.toBeInTheDocument();
      expect(container.querySelector('[data-timeline-item-key="response-1"]')).toBeNull();
    }
  );

  it.each(['saved', 'optimistic'])('opens the clarification flyout for a %s answer', (source) => {
    const prompt = createAskUserQuestionPrompt();
    const pausedEvents = [
      createExecutionStepEvent({
        id: 'step-ask',
        execution_id: executionId,
        data: {
          step: {
            type: ConversationRoundStepType.askUserQuestion,
            prompt_id: prompt.id,
            questions: prompt.questions,
          },
          sequence: 0,
        },
      }),
      createPromptRequestedTerminatedEvent({
        id: 'term-paused',
        execution_id: executionId,
        prompts: [prompt],
      }),
    ];
    const promptResponse = createPromptResponseEvent({
      id: 'response-1',
      data: {
        prompt_requested_event_id: 'term-paused',
        responses: { [prompt.id]: { answers: [{ choice: [0] }] } },
      },
    });
    const items =
      source === 'saved'
        ? buildSavedItems([...pausedEvents, promptResponse])
        : toTimelineItems({
            events: pausedEvents,
            activeExecution: {
              status: 'running',
              executionId: 'exec-resumed',
              steps: [],
              message: '',
              promptResponse,
            },
          });

    renderTimeline(items);

    expect(screen.queryByTestId('agentBuilderAskUserQuestionPrompt')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clarification • 1 answered' }));
    expect(screen.getByRole('heading', { name: 'Clarification' })).toBeInTheDocument();
    expect(screen.getByText('Which environment are you investigating?')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
  });
});

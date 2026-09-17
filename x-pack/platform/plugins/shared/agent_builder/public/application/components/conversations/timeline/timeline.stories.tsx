/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useReducer, useState } from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import type { Meta, StoryObj } from '@storybook/react';
import type { ChatEvent, PromptResponseEvent, TimelineEvent } from '@kbn/agent-builder-common';
import {
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { Timeline } from './timeline';
import { DevSseEmitter } from './dev_sse_emitter';
import type { ActiveExecutionDraft } from '../../../../services/events/active_execution_reducer';
import {
  activeExecutionReducer,
  withPromptResponse,
} from '../../../../services/events/active_execution_reducer';
import { buildSavedItems, toTimelineItems } from './to_timeline_items';
import { createUserMessageEvent } from './items/user_message_event.factory';
import { createExecutionStartedEvent } from './items/execution_started.factory';
import { createExecutionStepEvent } from './items/execution_step.factory';
import {
  createExecutionTerminatedEvent,
  createPromptRequestedTerminatedEvent,
} from './items/execution_terminated_event.factory';
import { createAskUserQuestionPrompt } from './items/prompt_request_event.factory';
import {
  createUserMessageItem,
  createCompletedTurnItem,
  createFailedTurnItem,
  createAbortedTurnItem,
  createStreamingTurnItem,
} from './items/timeline_item.factory';

const meta: Meta<typeof Timeline> = {
  title: 'Conversations/Timeline/Timeline',
  component: Timeline,
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider conversationId="story-conversation-1">
        <div style={{ maxWidth: 600, padding: 24 }}>
          <Story />
        </div>
      </AgentBuilderStorybookProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Timeline>;

export const FullConversation: Story = {
  args: {
    items: [
      createUserMessageItem(),
      createCompletedTurnItem(),
      createUserMessageItem({
        key: 'pending-1',
        isPending: true,
        event: createUserMessageEvent({
          id: 'pending-1',
          data: { message: 'Are there any anomalies in the last hour?' },
        }),
      }),
      createStreamingTurnItem({ key: 'execution-2' }),
    ],
  },
};

export const Default: Story = {
  args: {
    items: [
      createUserMessageItem(),
      createCompletedTurnItem(),
      createUserMessageItem({
        key: 'event-3',
        event: createUserMessageEvent({
          id: 'event-3',
          data: { message: 'Are there any anomalies in the last hour?' },
        }),
      }),
      createCompletedTurnItem({
        key: 'execution-2',
        startedAt: '2026-09-03T11:18:00.000Z',
        terminal: createExecutionTerminatedEvent({
          id: 'event-4',
          execution_id: 'execution-2',
          trigger_event_id: 'event-3',
          data: {
            model_usage: {
              connector_id: '.anthropic-claude-4.6-sonnet-chat_completion',
              llm_calls: 1,
              input_tokens: 120,
              output_tokens: 20,
              model: 'anthropic-claude-4.6-sonnet',
            },
            time_to_first_token: 480,
            time_to_last_token: 590,
            outcome: {
              type: 'responded',
              response: { message: 'No anomalies detected in the last hour.' },
            },
          },
        }),
      }),
    ],
  },
};

export const WithPendingMessage: Story = {
  args: {
    items: [
      createUserMessageItem(),
      createCompletedTurnItem(),
      createUserMessageItem({
        key: 'pending-1',
        isPending: true,
        event: createUserMessageEvent({
          id: 'pending-1',
          data: { message: 'Just sent - not persisted yet' },
        }),
      }),
    ],
  },
};

export const FailedExecution: Story = {
  args: {
    items: [createUserMessageItem(), createFailedTurnItem()],
  },
};

export const AbortedExecution: Story = {
  args: {
    items: [createUserMessageItem(), createAbortedTurnItem()],
  },
};

const pausePrompt = createAskUserQuestionPrompt();
const PAUSE_EXECUTION_ID = 'pause-exec-1';
const PAUSE_TERMINATED_ID = 'pause-exec-1::execution_terminated';

const pauseEvents: TimelineEvent[] = [
  createUserMessageEvent({
    id: 'pause-user-1',
    data: { message: 'Find the noisy services for me.' },
  }),
  createExecutionStartedEvent({
    id: 'pause-exec-1::execution_started',
    execution_id: PAUSE_EXECUTION_ID,
    trigger_event_id: 'pause-user-1',
  }),
  createExecutionStepEvent({
    id: 'pause-step-0',
    execution_id: PAUSE_EXECUTION_ID,
    trigger_event_id: 'pause-user-1',
    data: {
      step: {
        type: ConversationRoundStepType.askUserQuestion,
        prompt_id: pausePrompt.id,
        questions: pausePrompt.questions,
      },
      sequence: 0,
    },
  }),
  createPromptRequestedTerminatedEvent({
    prompts: [pausePrompt],
    id: PAUSE_TERMINATED_ID,
    execution_id: PAUSE_EXECUTION_ID,
    trigger_event_id: 'pause-user-1',
  }),
];

const pauseAnswer: PromptResponseEvent = {
  id: 'pause-response-1',
  type: TimelineEventType.promptResponse,
  created_at: '2026-09-03T11:20:00.000Z',
  actor: { type: EventActorType.user, id: 'user-1' },
  data: {
    prompt_requested_event_id: PAUSE_TERMINATED_ID,
    responses: { [pausePrompt.id]: { answers: [{ choice: [0] }] } },
  },
};

export const AwaitingPrompt: Story = {
  args: { items: buildSavedItems(pauseEvents) },
};

export const AnsweredPause: Story = {
  args: {
    items: buildSavedItems([
      ...pauseEvents,
      pauseAnswer,
      createExecutionStartedEvent({
        id: 'resume-exec-1::execution_started',
        execution_id: 'resume-exec-1',
        trigger_event_id: 'pause-response-1',
      }),
      createExecutionTerminatedEvent({
        id: 'resume-exec-1::execution_terminated',
        execution_id: 'resume-exec-1',
        trigger_event_id: 'pause-response-1',
        data: {
          model_usage: {
            connector_id: '',
            llm_calls: 1,
            input_tokens: 120,
            output_tokens: 20,
            model: 'dev',
          },
          time_to_first_token: 120,
          time_to_last_token: 300,
          outcome: {
            type: 'responded',
            response: { message: 'checkout-api is the noisiest service in production.' },
          },
        },
      }),
    ]),
  },
};

type DevAction =
  | { kind: 'chat'; event: ChatEvent }
  | { kind: 'answer'; event: PromptResponseEvent };

const devReducer = (
  state: ActiveExecutionDraft | null,
  action: DevAction
): ActiveExecutionDraft | null =>
  action.kind === 'chat'
    ? activeExecutionReducer(state, action.event)
    : withPromptResponse(state, action.event);

const InteractiveInner: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const [activeExecution, dispatch] = useReducer(devReducer, null);
  const [log, setLog] = useState<Array<ChatEvent | PromptResponseEvent>>([]);
  const apply = useCallback((action: DevAction) => {
    dispatch(action);
    setLog((previous) => [...previous, action.event]);
  }, []);
  const emit = useCallback((event: ChatEvent) => apply({ kind: 'chat', event }), [apply]);
  const recordPromptResponse = useCallback(
    (event: PromptResponseEvent) => apply({ kind: 'answer', event }),
    [apply]
  );

  const toTimelineItemsInput = { events: [] as TimelineEvent[], activeExecution };
  const items = toTimelineItems(toTimelineItemsInput);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <DevSseEmitter emit={emit} recordPromptResponse={recordPromptResponse} reset={onReset} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder paddingSize="l">
          <Timeline items={items} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiAccordion id="debug-sse" buttonContent={`Raw SSE events (${log.length})`}>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" isCopyable overflowHeight={300}>
            {JSON.stringify(log, null, 2)}
          </EuiCodeBlock>
        </EuiAccordion>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiAccordion id="debug-source" buttonContent="Source">
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" isCopyable overflowHeight={300}>
            {JSON.stringify(toTimelineItemsInput, null, 2)}
          </EuiCodeBlock>
        </EuiAccordion>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiAccordion id="debug-derived" buttonContent="Derived items">
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" isCopyable overflowHeight={300}>
            {JSON.stringify(items, null, 2)}
          </EuiCodeBlock>
        </EuiAccordion>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const InteractiveStory: React.FC = () => {
  const [resetKey, setResetKey] = useState(0);
  const reset = useCallback(() => setResetKey((k) => k + 1), []);
  return <InteractiveInner key={resetKey} onReset={reset} />;
};

export const Interactive: Story = {
  render: () => <InteractiveStory />,
};

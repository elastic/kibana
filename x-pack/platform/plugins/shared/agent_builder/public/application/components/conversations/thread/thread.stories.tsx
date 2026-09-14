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
import type { ChatEvent, TimelineEvent } from '@kbn/agent-builder-common';
import { isRoundCompleteEvent, ConversationRoundStepType } from '@kbn/agent-builder-common';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { Thread } from './thread';
import { DevSseEmitter } from './dev_sse_emitter';
import {
  activeExecutionReducer,
  type ActiveExecutionDraft,
} from '../../../../services/events/active_execution_reducer';
import { toThreadItems } from './to_thread_items';
import { createUserMessageEvent } from './items/user_message.factory';
import { createExecutionStartedEvent } from './items/execution_started.factory';
import { createExecutionStepEvent } from './items/execution_step.factory';
import { createExecutionTerminatedEvent } from './items/execution_terminated.factory';
import {
  createUserMessageItem,
  createCompletedTurnItem,
  createFailedTurnItem,
  createAbortedTurnItem,
  createStreamingTurnItem,
} from './items/thread_item.factory';

const storyReducer = (
  state: ActiveExecutionDraft | null,
  event: ChatEvent
): ActiveExecutionDraft | null =>
  isRoundCompleteEvent(event) ? null : activeExecutionReducer(state, event);

const seedEvents: TimelineEvent[] = [
  createUserMessageEvent({ id: 'seed-1' }),
  createExecutionStartedEvent({
    id: 'seed-exec-started',
    execution_id: 'seed-exec-1',
    trigger_event_id: 'seed-1',
  }),
  createExecutionStepEvent({
    id: 'seed-step-0',
    execution_id: 'seed-exec-1',
    trigger_event_id: 'seed-1',
    data: {
      step: {
        type: ConversationRoundStepType.reasoning,
        reasoning: 'Looking at the available tools...',
      },
      sequence: 0,
    },
  }),
  createExecutionStepEvent({
    id: 'seed-step-1',
    execution_id: 'seed-exec-1',
    trigger_event_id: 'seed-1',
    data: {
      step: { type: ConversationRoundStepType.reasoning, reasoning: 'Querying host metrics.' },
      sequence: 1,
    },
  }),
  createExecutionTerminatedEvent({
    id: 'seed-2',
    execution_id: 'seed-exec-1',
    trigger_event_id: 'seed-1',
  }),
  createUserMessageEvent({
    id: 'seed-3',
    data: { message: 'Are there any anomalies in the last hour?' },
  }),
];

const meta: Meta<typeof Thread> = {
  title: 'Conversations/Thread/Thread',
  component: Thread,
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

type Story = StoryObj<typeof Thread>;

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
            steps: [],
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

const InteractiveInner: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const [activeExecution, dispatch] = useReducer(storyReducer, null);
  const emit = useCallback((event: ChatEvent) => dispatch(event), []);

  const toThreadItemsInput = { events: seedEvents, activeExecution };
  const items = toThreadItems(toThreadItemsInput);

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <DevSseEmitter emit={emit} reset={onReset} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder paddingSize="l">
          <Thread items={items} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiAccordion id="debug-source" buttonContent="Source">
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" isCopyable overflowHeight={300}>
            {JSON.stringify(toThreadItemsInput, null, 2)}
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

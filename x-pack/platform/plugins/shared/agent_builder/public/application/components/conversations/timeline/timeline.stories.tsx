/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useReducer, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import type { Meta, StoryObj } from '@storybook/react';
import type { ChatEvent, ConversationEvent, TimelineEvent } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import {
  STORY_CUSTOM_EVENT_TYPE,
  STORY_CUSTOM_EVENT_WITH_HEADER_TYPE,
  STORY_INLINE_ATTACHMENT_TYPE,
  storyAgent,
  storyNoteEventDefinition,
} from '../../../__storybook__/agent_builder_services';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { Timeline } from './timeline';
import { DevSseEmitter } from './dev_sse_emitter';
import { sseToEvents, emptyLiveEventsState } from '../../../../services/events/sse_to_events';
import { buildItems } from './to_timeline_items';
import { resolveTimelineItems } from './resolve_timeline_items';
import { createUserMessageEvent } from './items/user_message_event.factory';
import { createExecutionStartedEvent } from './items/execution_started.factory';
import { createExecutionStepEvent } from './items/execution_step.factory';
import { createExecutionTerminatedEvent } from './items/execution_terminated_event.factory';
import { createAttachmentAddedEvent } from './items/attachment_added_event.factory';
import { createVersionedAttachment } from './items/versioned_attachment.factory';
import { createCustomEvent } from './items/custom_event.factory';
import {
  createAttachmentItem,
  createCustomEventItem,
  createUserMessageItem,
  createCompletedTurnItem,
  createFailedTurnItem,
  createAbortedTurnItem,
  createStreamingTurnItem,
} from './items/timeline_item.factory';

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
  // Added over the API with render_inline, so it draws as a card between the two turns.
  createAttachmentAddedEvent({
    id: 'seed-attachment-added',
    created_at: '2026-09-03T11:17:45.000Z',
    data: {
      attachment_id: 'seed-attachment',
      attachment_type: STORY_INLINE_ATTACHMENT_TYPE,
      current_version: 1,
      render_inline: true,
      source: 'http_api',
    },
  }),
  createUserMessageEvent({
    id: 'seed-3',
    data: { message: 'Are there any anomalies in the last hour?' },
  }),
];

const seedAttachments: VersionedAttachment[] = [
  createVersionedAttachment({
    id: 'seed-attachment',
    type: STORY_INLINE_ATTACHMENT_TYPE,
    versions: [
      {
        version: 1,
        data: { text: 'Cluster has 4 standalone indices and 2 data streams as of this morning.' },
        created_at: '2026-09-03T11:17:45.000Z',
        content_hash: 'seed-hash-1',
      },
    ],
  }),
];

const inlineAttachmentItem = createAttachmentItem({
  key: 'story-attachment-added',
  attachment: seedAttachments[0],
  version: 1,
});

const customEventItem = createCustomEventItem({
  key: 'story-custom-event',
  event: createCustomEvent({ id: 'story-custom-event', type: STORY_CUSTOM_EVENT_TYPE }),
  definition: storyNoteEventDefinition,
});

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
  args: {
    agent: storyAgent,
  },
};
export default meta;

type Story = StoryObj<typeof Timeline>;

export const FullConversation: Story = {
  args: {
    conversationAttachments: seedAttachments,
    items: [
      createUserMessageItem(),
      createCompletedTurnItem(),
      inlineAttachmentItem,
      customEventItem,
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

/** An event written over the API, which reaches the timeline on the next refetch, not over SSE. */
interface StoredEvent {
  event: ConversationEvent;
  /** How many live events existed when it was added, so it keeps its place in click order. */
  afterLiveEvents: number;
}

const mergeStoredEvents = (
  liveEvents: ConversationEvent[],
  storedEvents: StoredEvent[]
): ConversationEvent[] => {
  const merged: ConversationEvent[] = [];
  let liveIndex = 0;
  for (const { event, afterLiveEvents } of storedEvents) {
    merged.push(...liveEvents.slice(liveIndex, afterLiveEvents), event);
    liveIndex = Math.max(liveIndex, afterLiveEvents);
  }
  return [...merged, ...liveEvents.slice(liveIndex)];
};

const InteractiveInner: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  const [liveState, dispatch] = useReducer(sseToEvents, undefined, emptyLiveEventsState);
  const emit = useCallback((event: ChatEvent) => dispatch(event), []);
  const [storedEvents, setStoredEvents] = useState<StoredEvent[]>([]);
  const [addedAttachments, setAddedAttachments] = useState<VersionedAttachment[]>([]);

  const store = (event: ConversationEvent) =>
    setStoredEvents((previous) => [
      ...previous,
      { event, afterLiveEvents: liveState.events.length },
    ]);

  const addAttachment = () => {
    const count = addedAttachments.length + 1;
    const attachmentId = `story-added-attachment-${count}`;
    const createdAt = new Date().toISOString();
    setAddedAttachments((previous) => [
      ...previous,
      createVersionedAttachment({
        id: attachmentId,
        type: STORY_INLINE_ATTACHMENT_TYPE,
        versions: [
          {
            version: 1,
            data: { text: `Attachment ${count}, added from the story.` },
            created_at: createdAt,
            content_hash: `story-added-hash-${count}`,
          },
        ],
      }),
    ]);
    store(
      createAttachmentAddedEvent({
        id: `${attachmentId}::attachment_added`,
        created_at: createdAt,
        data: {
          attachment_id: attachmentId,
          attachment_type: STORY_INLINE_ATTACHMENT_TYPE,
          current_version: 1,
          render_inline: true,
          source: 'http_api',
        },
      })
    );
  };

  const addCustomEvent = (type: string) => {
    const count =
      storedEvents.filter(({ event }) =>
        [STORY_CUSTOM_EVENT_TYPE, STORY_CUSTOM_EVENT_WITH_HEADER_TYPE].includes(event.type)
      ).length + 1;
    store(
      createCustomEvent({
        id: `story-added-custom-event-${count}`,
        type,
        created_at: new Date().toISOString(),
        data: { title: `Note ${count}`, text: 'Added from the story.' },
      })
    );
  };

  const events = [...seedEvents, ...mergeStoredEvents(liveState.events, storedEvents)];
  const attachments = [...seedAttachments, ...addedAttachments];
  const { attachmentsService, conversationEventsService } = useAgentBuilderServices();
  const items = resolveTimelineItems(buildItems(events), {
    attachments,
    attachmentsService,
    conversationEventsService,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <DevSseEmitter emit={emit} reset={onReset} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" iconType="document" onClick={addAttachment}>
              Add inline attachment
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="editorComment"
              onClick={() => addCustomEvent(STORY_CUSTOM_EVENT_TYPE)}
            >
              Add custom event
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="editorComment"
              onClick={() => addCustomEvent(STORY_CUSTOM_EVENT_WITH_HEADER_TYPE)}
            >
              Add custom event (with header)
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder paddingSize="l">
          <Timeline items={items} agent={storyAgent} conversationAttachments={attachments} />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiAccordion id="debug-source" buttonContent="Source">
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" isCopyable overflowHeight={300}>
            {JSON.stringify(events, null, 2)}
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

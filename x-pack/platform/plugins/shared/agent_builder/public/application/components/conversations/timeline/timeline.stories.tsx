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
  EuiTitle,
} from '@elastic/eui';
import type { Meta, StoryObj } from '@storybook/react';
import type { ChatEvent, ConversationEvent, TimelineEvent } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
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
import type { AddItemButton } from './dev_sse_emitter';
import { sseToEvents, emptyLiveEventsState } from '../../../../services/events/sse_to_events';
import { buildItems } from './to_timeline_items';
import { resolveTimelineItems } from './resolve_timeline_items';
import { createUserMessageEvent } from './items/user_message_event.factory';
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

// The Interactive story starts empty apart from a single user message, so you
// build the turn by hand from the control panel on the right.
const seedEvents: TimelineEvent[] = [
  createUserMessageEvent({ id: 'seed-1', data: { message: 'How many indices do I have?' } }),
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
    (Story, context) => {
      // The Interactive story lays out a wide two-column view (conversation +
      // control panel), so it opts out of the 600px conversation-width clamp
      // the other stories use to mimic the real app.
      const isInteractive = context.name === 'Interactive';
      return (
        <AgentBuilderStorybookProvider conversationId="story-conversation-1">
          <div style={{ maxWidth: isInteractive ? undefined : 600, padding: 24 }}>
            <Story />
          </div>
        </AgentBuilderStorybookProvider>
      );
    },
  ],
  args: {
    agent: storyAgent,
  },
};
export default meta;

type Story = StoryObj<typeof Timeline>;

export const Default: Story = {
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
  const attachments = addedAttachments;
  const { attachmentsService, conversationEventsService } = useAgentBuilderServices();
  const items = resolveTimelineItems(buildItems(events), {
    attachments,
    attachmentsService,
    conversationEventsService,
  });

  const addItemButtons: AddItemButton[] = [
    {
      id: 'add-attachment',
      label: 'inline attachment',
      onClick: addAttachment,
    },
    {
      id: 'add-custom-event',
      label: 'custom event',
      onClick: () => addCustomEvent(STORY_CUSTOM_EVENT_TYPE),
    },
    {
      id: 'add-custom-event-header',
      label: 'custom event (header)',
      onClick: () => addCustomEvent(STORY_CUSTOM_EVENT_WITH_HEADER_TYPE),
    },
  ];

  return (
    <EuiFlexGroup direction="row" gutterSize="l" alignItems="flexStart" responsive={false}>
      {/* Left column: the conversation, kept at the real app width so it reads realistically. */}
      <EuiFlexItem grow={false} style={{ width: 600, maxWidth: '100%' }}>
        <EuiPanel hasBorder paddingSize="l">
          <Timeline items={items} agent={storyAgent} conversationAttachments={attachments} />
        </EuiPanel>
      </EuiFlexItem>
      {/* Middle column: the control deck. Sticky so it stays in view while the timeline scrolls. */}
      <EuiFlexItem grow={false} style={{ width: 340 }}>
        <div style={{ position: 'sticky', top: 24 }}>
          <DevSseEmitter emit={emit} reset={onReset} addItemButtons={addItemButtons} />
        </div>
      </EuiFlexItem>
      {/* Right column: debug views of the raw events and the derived timeline items. */}
      {/* minWidth: 0 keeps the column from growing with the JSON; the code block scrolls instead. */}
      <EuiFlexItem grow={false} style={{ width: 360, minWidth: 0 }}>
        <div style={{ position: 'sticky', top: 24 }}>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xxs">
              <h3>Debug</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiAccordion id="debug-source" buttonContent="Source">
              <EuiSpacer size="s" />
              <EuiCodeBlock language="json" isCopyable overflowHeight={300}>
                {JSON.stringify(events, null, 2)}
              </EuiCodeBlock>
            </EuiAccordion>
            <EuiSpacer size="s" />
            <EuiAccordion id="debug-derived" buttonContent="Derived items">
              <EuiSpacer size="s" />
              <EuiCodeBlock language="json" isCopyable overflowHeight={300}>
                {JSON.stringify(items, null, 2)}
              </EuiCodeBlock>
            </EuiAccordion>
          </EuiPanel>
        </div>
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

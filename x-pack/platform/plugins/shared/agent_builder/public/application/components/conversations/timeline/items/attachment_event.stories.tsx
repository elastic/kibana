/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AgentBuilderStorybookProvider } from '../../../../__storybook__/agent_builder_storybook_provider';
import { STORY_INLINE_ATTACHMENT_TYPE } from '../../../../__storybook__/agent_builder_services';
import { AttachmentEvent } from './attachment_event';
import { createAttachmentAddedEvent } from './attachment_added_event.factory';
import { createAttachmentUpdatedEvent } from './attachment_updated_event.factory';
import { createAttachmentItem } from './timeline_item.factory';
import { createVersionedAttachment } from './versioned_attachment.factory';

const attachment = createVersionedAttachment({
  id: 'story-note',
  type: STORY_INLINE_ATTACHMENT_TYPE,
  current_version: 2,
  versions: [
    {
      version: 1,
      data: { text: 'Cluster has 4 standalone indices and 2 data streams as of this morning.' },
      created_at: '2026-09-03T11:17:50.000Z',
      content_hash: 'story-hash-1',
    },
    {
      version: 2,
      data: { text: 'Correction: 5 standalone indices. The sample flights index was missed.' },
      created_at: '2026-09-03T11:18:50.000Z',
      content_hash: 'story-hash-2',
    },
  ],
});

const meta: Meta<typeof AttachmentEvent> = {
  title: 'Conversations/Timeline/Attachment Event',
  component: AttachmentEvent,
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

type Story = StoryObj<typeof AttachmentEvent>;

/** The card for an attachment added with `render_inline`. */
export const Added: Story = {
  args: {
    item: createAttachmentItem({
      event: createAttachmentAddedEvent({
        data: {
          attachment_id: attachment.id,
          attachment_type: STORY_INLINE_ATTACHMENT_TYPE,
          current_version: 1,
          render_inline: true,
          source: 'http_api',
        },
      }),
      attachment,
      version: 1,
    }),
  },
};

/** The card for a later version; the renderer receives the previous version as its diff base. */
export const Updated: Story = {
  args: {
    item: createAttachmentItem({
      event: createAttachmentUpdatedEvent({
        data: {
          attachment_id: attachment.id,
          attachment_type: STORY_INLINE_ATTACHMENT_TYPE,
          previous_version: 1,
          current_version: 2,
          render_inline: true,
          source: 'http_api',
        },
      }),
      attachment,
      version: 2,
    }),
  },
};

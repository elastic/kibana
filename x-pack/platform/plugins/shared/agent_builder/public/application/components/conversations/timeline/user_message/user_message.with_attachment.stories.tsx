/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ATTACHMENT_REF_ACTOR, AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import { AgentBuilderStorybookProvider } from '../../../../__storybook__/agent_builder_storybook_provider';
import {
  STORY_INLINE_ATTACHMENT_TYPE,
  registerStorybookImage,
} from '../../../../__storybook__/agent_builder_services';
import { STORYBOOK_CURRENT_USER_ID } from '../../../../__storybook__/kibana_services';
import { createVersionedAttachment } from '../items/versioned_attachment.factory';
import { UserMessage } from './user_message';

const IMAGE_FILE_ID = 'story-image-file';
registerStorybookImage(
  IMAGE_FILE_ID,
  `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#3b3b3b"/><text x="150" y="105" fill="#fff" font-size="24" text-anchor="middle">Dummy image</text></svg>'
  )}`
);

const textAttachment = createVersionedAttachment({
  id: 'story-text-attachment',
  type: STORY_INLINE_ATTACHMENT_TYPE,
  versions: [
    {
      version: 1,
      data: { text: 'Cluster has 4 standalone indices and 2 data streams.' },
      created_at: '2026-09-03T11:17:50.000Z',
      content_hash: 'story-text-hash',
    },
  ],
});

const imageAttachment = createVersionedAttachment({
  id: 'story-image-attachment',
  type: AttachmentType.image,
  versions: [
    {
      version: 1,
      data: { file_id: IMAGE_FILE_ID, name: 'screenshot.png', mime_type: 'image/png' },
      created_at: '2026-09-03T11:17:50.000Z',
      content_hash: 'story-image-hash',
    },
  ],
});

const userRef = (attachmentId: string): AttachmentVersionRef => ({
  attachment_id: attachmentId,
  version: 1,
  actor: ATTACHMENT_REF_ACTOR.user,
});

const meta: Meta<typeof UserMessage> = {
  title: 'Conversations/Timeline/User Message/With attachment',
  component: UserMessage,
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
    author: { id: STORYBOOK_CURRENT_USER_ID },
    isPendingCurrentRound: false,
    startedAt: '2026-01-01T10:00:00.000Z',
    conversationAttachments: [textAttachment, imageAttachment],
  },
};
export default meta;

type Story = StoryObj<typeof UserMessage>;

export const WithTextAttachment: Story = {
  args: {
    input: 'Can you check the note I attached?',
    attachmentRefs: [userRef(textAttachment.id)],
  },
};

export const WithImageAttachment: Story = {
  args: {
    input: 'What is wrong in this screenshot?',
    attachmentRefs: [userRef(imageAttachment.id)],
  },
};

/** No bubble: only the author header and the attachment under the "Added" label. */
export const WithoutTextWithAttachment: Story = {
  args: {
    input: '',
    attachmentRefs: [userRef(textAttachment.id)],
  },
};

/** The images live in the bubble, so it stays when there is no text. */
export const WithoutTextWithImageAttachment: Story = {
  args: {
    input: '',
    attachmentRefs: [userRef(imageAttachment.id)],
  },
};

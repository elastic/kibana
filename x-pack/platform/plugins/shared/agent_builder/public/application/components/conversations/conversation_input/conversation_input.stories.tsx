/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ConversationInput } from './conversation_input';
import {
  __setMockAttachments,
  MOCK_IMAGE_ATTACHMENT,
} from '../../../context/conversation/__storybook_mocks__/conversation_context';
import { createImagePlaceholderElement } from './message_editor/image_placeholder';

// Hooks/services used by ConversationInput are replaced via __storybook_mocks__ directories.
// Attachment state is controlled per-story via __setMockAttachments().

const meta: Meta<typeof ConversationInput> = {
  title: 'Agent Builder/Conversation Input',
  component: ConversationInput,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 640, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'padded',
  },
};
export default meta;

type Story = StoryObj<typeof ConversationInput>;

export const Empty: Story = {
  decorators: [
    (Story) => {
      __setMockAttachments([]);
      return <Story />;
    },
  ],
};

export const OneImage: Story = {
  name: '1 Image',
  decorators: [
    (Story) => {
      __setMockAttachments([MOCK_IMAGE_ATTACHMENT]);
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const editor = canvasElement.querySelector(
      '[data-test-subj="agentBuilderConversationInputEditor"]'
    );
    if (!editor) return;

    editor.innerHTML = '';
    editor.appendChild(document.createTextNode('On this image '));
    editor.appendChild(createImagePlaceholderElement('screenshot.png'));
    editor.appendChild(document.createTextNode(' you can see everything.'));
  },
};

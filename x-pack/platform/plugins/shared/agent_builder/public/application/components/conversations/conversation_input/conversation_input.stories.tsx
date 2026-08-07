/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { ConversationInput } from './conversation_input';

// 1×1 blue pixel PNG — enough for the file type check and thumbnail to render
const BLUE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const pngBytes = Uint8Array.from(atob(BLUE_PIXEL_PNG_BASE64), (c) => c.charCodeAt(0));

const meta: Meta<typeof ConversationInput> = {
  title: 'Agent Builder/Conversation Input',
  component: ConversationInput,
  args: {
    onSubmitOverride: fn(),
  },
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider>
        <div style={{ maxWidth: 640, padding: 16 }}>
          <Story />
        </div>
      </AgentBuilderStorybookProvider>
    ),
  ],
  parameters: {
    layout: 'padded',
  },
};
export default meta;

type Story = StoryObj<typeof ConversationInput>;

export const Empty: Story = {};

export const OneImage: Story = {
  name: '1 Image',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('agentBuilderConversationInputEditor');
    await userEvent.click(editor);
    await userEvent.type(editor, 'Pasting here: ');

    const dt = new DataTransfer();
    dt.items.add(new File([pngBytes], 'screenshot.png', { type: 'image/png' }));
    await userEvent.paste(dt);
  },
};

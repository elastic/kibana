/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { ConversationInput } from './conversation_input';

// 1×1 blue pixel PNG — minimal valid image for clipboard paste
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

export const WithText: Story = {
  name: 'With text — submit enabled',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('agentBuilderConversationInputEditor');
    const submitButton = await canvas.findByTestId('agentBuilderConversationInputSubmitButton');

    // Submit starts disabled
    expect(submitButton).toBeDisabled();

    await userEvent.click(editor);
    await userEvent.type(editor, 'Hello');

    // Submit becomes enabled after typing
    expect(submitButton).not.toBeDisabled();
  },
};

export const OneImage: Story = {
  name: '1 Image — paste shows chip + spinner pill',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('agentBuilderConversationInputEditor');
    await userEvent.click(editor);
    await userEvent.type(editor, 'Check this: ');

    const dt = new DataTransfer();
    dt.items.add(new File([pngBytes], 'Q3 design brief.png', { type: 'image/png' }));
    await userEvent.paste(dt);

    // Placeholder chip should appear in the editor
    expect(editor.querySelector('[data-image-placeholder]')).not.toBeNull();
    // Spinner pill row should appear
    expect(await canvas.findByTestId('agentBuilderAttachmentPillsRow')).toBeInTheDocument();
  },
};

let neverResolvingFileIdCounter = 0;
/** filesClient whose upload() never resolves — keeps both the inline chip and the row pill in loading state forever. */
const neverResolvingFilesClient = {
  create: () =>
    Promise.resolve({ file: { id: `storybook-loading-file-${++neverResolvingFileIdCounter}` } }),
  upload: () => new Promise<void>(() => {}),
  list: () => Promise.resolve({ files: [], total: 0 }),
  get: () => Promise.resolve({ file: null }),
  getDownloadHref: () => '',
  delete: () => Promise.resolve(),
  update: () => Promise.resolve({ file: null }),
  getMetrics: () => Promise.resolve({}),
  publicDownload: () => Promise.resolve(),
} as never;

export const Loading: Story = {
  name: 'Loading — upload never finishes',
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider services={{ filesClient: neverResolvingFilesClient }}>
        <Story />
      </AgentBuilderStorybookProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('agentBuilderConversationInputEditor');
    await userEvent.click(editor);
    await userEvent.type(editor, 'Check this: ');

    const dt = new DataTransfer();
    dt.items.add(new File([pngBytes], 'screenshot.png', { type: 'image/png' }));
    await userEvent.paste(dt);

    // Inline placeholder chip with 2px indeterminate progress bar
    expect(editor.querySelector('[data-image-placeholder]')).not.toBeNull();
    expect(editor.querySelector('[data-uploading="true"]')).not.toBeNull();
    // Uploading pill row with UploadingImagePill progress bar
    expect(await canvas.findByTestId('agentBuilderAttachmentPillsRow')).toBeInTheDocument();
  },
};

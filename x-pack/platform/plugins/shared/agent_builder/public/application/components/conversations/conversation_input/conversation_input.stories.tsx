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
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { ConversationInput } from './conversation_input';

const ConversationInputForStorybook: React.FC<React.ComponentProps<typeof ConversationInput>> = (
  props
) => {
  const { resetAttachments } = useConversationContext();
  return (
    <ConversationInput
      {...props}
      onSubmitOverride={(content) => {
        props.onSubmitOverride?.(content);
        resetAttachments?.();
      }}
    />
  );
};

const BLUE_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const pngBytes = Uint8Array.from(atob(BLUE_PIXEL_PNG_BASE64), (c) => c.charCodeAt(0));

const createColorPngBlob = (color: string): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob as Blob), 'image/png'));
};

const createColorPngFile = async (name: string, color: string): Promise<File> =>
  new File([await createColorPngBlob(color)], name, { type: 'image/png' });

const meta: Meta<typeof ConversationInput> = {
  title: 'Conversation Input/Image Upload',
  component: ConversationInput,
  args: {
    onSubmitOverride: fn(),
  },
  render: (args) => <ConversationInputForStorybook {...args} />,
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

export const Loading: Story = {
  name: 'Loading',
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

    expect(editor.querySelector('[data-image-placeholder]')).not.toBeNull();
    expect(editor.querySelector('[data-uploading="true"]')).not.toBeNull();
    expect(await canvas.findByTestId('agentBuilderAttachmentPillsRow')).toBeInTheDocument();
  },
};

export const OneImage: Story = {
  name: '1 Image',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('agentBuilderConversationInputEditor');
    await userEvent.click(editor);
    await userEvent.type(editor, 'Check this: ');

    const dt = new DataTransfer();
    dt.items.add(new File([pngBytes], 'Q3 design brief.png', { type: 'image/png' }));
    await userEvent.paste(dt);

    expect(editor.querySelector('[data-image-placeholder]')).not.toBeNull();
    expect(await canvas.findByTestId('agentBuilderAttachmentPillsRow')).toBeInTheDocument();
  },
};

let neverResolvingFileIdCounter = 0;
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

const WEIRD_FILENAMES_WITH_COLORS = [
  [
    'this-is-an-extremely-long-filename-that-someone-might-actually-have-on-their-computer-because-they-never-clean-up-their-downloads-folder-screenshot-2026-final-v3-FINAL-actually-final.png',
    '#e63946',
  ],
  ["50% () — v2 [] & #3 'quoted' @user.png", '#2a9d8f'],
  ['   ScReEnShOt   With   Extra   Spaces   .PNG', '#e9c46a'],
  ['a', '#aaaccc'],
] as const;

export const DuplicateFilename: Story = {
  name: 'Duplicate Filename',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('agentBuilderConversationInputEditor');
    await userEvent.click(editor);

    for (const color of ['#e63946', '#2a9d8f']) {
      const dt = new DataTransfer();
      dt.items.add(await createColorPngFile('duplicate.png', color));
      await userEvent.paste(dt);
    }

    expect(editor.querySelector('[data-placeholder-name="duplicate.png"]')).not.toBeNull();
    expect(editor.querySelector('[data-placeholder-name="duplicate 2.png"]')).not.toBeNull();
  },
};

export const MultipleImagesWithTrickyFilenames: Story = {
  name: 'Multiple Images (Tricky Filenames)',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByTestId('agentBuilderConversationInputEditor');
    await userEvent.click(editor);
    await userEvent.type(editor, 'Check these: ');

    for (const [name, color] of WEIRD_FILENAMES_WITH_COLORS) {
      const dt = new DataTransfer();
      dt.items.add(await createColorPngFile(name, color));
      await userEvent.paste(dt);
    }

    expect(editor.querySelectorAll('[data-image-placeholder]')).toHaveLength(
      WEIRD_FILENAMES_WITH_COLORS.length
    );
    expect(await canvas.findByTestId('agentBuilderAttachmentPillsRow')).toBeInTheDocument();
  },
};

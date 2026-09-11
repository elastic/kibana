/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { createStorybookAgentBuilderServices } from '../../../__storybook__/agent_builder_services';
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

const pasteImage = async (
  canvasElement: HTMLElement,
  { name, color = '#4c6ef5', typeText }: { name: string; color?: string; typeText?: string }
): Promise<HTMLElement> => {
  const canvas = within(canvasElement);
  const editor = await canvas.findByTestId('agentBuilderConversationInputEditor');
  await userEvent.click(editor);
  if (typeText) {
    await userEvent.type(editor, typeText);
  }

  const dt = new DataTransfer();
  dt.items.add(await createColorPngFile(name, color));
  await userEvent.paste(dt);

  return editor;
};

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
    await pasteImage(canvasElement, { name: 'screenshot.png', typeText: 'Check this: ' });
  },
};

export const OneImage: Story = {
  name: '1 Image',
  play: async ({ canvasElement }) => {
    await pasteImage(canvasElement, { name: 'Q3 design brief.png', typeText: 'Check this: ' });
  },
};

const DASHBOARD_ATTACHMENT_TYPE = 'platform.dashboard.dashboard_state';

const attachmentsService = createStorybookAgentBuilderServices().attachmentsService;
if (!attachmentsService.hasAttachmentType(DASHBOARD_ATTACHMENT_TYPE)) {
  attachmentsService.addAttachmentType(DASHBOARD_ATTACHMENT_TYPE, {
    getLabel: (attachment) => (attachment.data as { title?: string }).title ?? 'Dashboard',
    getIcon: () => 'dashboardApp',
  });
}

const createDashboardAttachment = (
  title: string,
  id = 'story-dashboard-1'
): ConversationAttachment => ({
  id,
  type: DASHBOARD_ATTACHMENT_TYPE,
  data: { title, panels: [] },
});

export const MixedAttachmentTypes: Story = {
  name: 'Dashboard + Image',
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider
        initialAttachments={[createDashboardAttachment('[Flights] Global Flight Dashboard')]}
      >
        <Story />
      </AgentBuilderStorybookProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    await pasteImage(canvasElement, { name: 'open.png' });
  },
};

export const DuplicateFilename: Story = {
  name: 'Duplicate Filename',
  play: async ({ canvasElement }) => {
    await pasteImage(canvasElement, { name: 'duplicate.png', color: '#e63946' });
    await pasteImage(canvasElement, { name: 'duplicate.png', color: '#2a9d8f' });
  },
};

const WEIRD_FILENAMES_WITH_COLORS = [
  [
    'this-is-an-extremely-long-filename-that-someone-might-actually-have-on-their-computer-because-they-never-clean-up-their-downloads-folder-screenshot-2026-final-v3-FINAL-actually-final.png',
    '#e63946',
  ],
  ["50% () — v2 [] & #3 'quoted' @user.png", '#2a9d8f'],
  ['   ScReEnShOt   With   Extra   Spaces   .PNG', '#e9c46a'],
  ['a', '#aaaccc'],
] as const;

export const MultipleImagesWithTrickyFilenames: Story = {
  name: 'Multiple Images (Tricky Filenames)',
  play: async ({ canvasElement }) => {
    const [[firstName, firstColor], ...rest] = WEIRD_FILENAMES_WITH_COLORS;
    await pasteImage(canvasElement, {
      name: firstName,
      color: firstColor,
      typeText: 'Check these: ',
    });
    for (const [name, color] of rest) {
      await pasteImage(canvasElement, { name, color });
    }
  },
};

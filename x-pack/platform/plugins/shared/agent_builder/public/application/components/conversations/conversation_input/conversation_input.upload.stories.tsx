/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiGlobalToastList } from '@elastic/eui';
import type { EuiGlobalToastListToast } from '@elastic/eui';
import { QueryClient } from '@kbn/react-query';
import { fn, userEvent, within } from '@storybook/test';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import type {
  ConversationAttachment,
  SupportedBinaryMimeType,
} from '@kbn/agent-builder-common/attachments';
import {
  MAX_BINARY_BYTES,
  SUPPORTED_BINARY_MIME_TYPES,
} from '@kbn/agent-builder-common/attachments';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { createStorybookAgentBuilderServices } from '../../../__storybook__/agent_builder_services';
import { createStorybookKibanaServices } from '../../../__storybook__/kibana_services';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { ConversationInput } from './conversation_input';
import { MAX_FILES_PER_MESSAGE } from './file_checks';
import { MAX_TEXT_FILE_BYTES } from './file_type';

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

const MINIMAL_PDF = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj
trailer << /Root 1 0 R >>
%%EOF
`;

const MINIMAL_MARKDOWN = '# Notes\n\n- First point\n- Second point\n';

const createFileToPaste = (name: string, sizeBytes?: number): File => {
  const isPdf = name.endsWith('.pdf');
  const content = isPdf ? MINIMAL_PDF : MINIMAL_MARKDOWN;
  const padding =
    sizeBytes && sizeBytes > content.length ? [new Uint8Array(sizeBytes - content.length)] : [];
  return new File([content, ...padding], name, { type: isPdf ? 'application/pdf' : '' });
};

const pasteFile = async (
  canvasElement: HTMLElement,
  { name, typeText, sizeBytes }: { name: string; typeText?: string; sizeBytes?: number }
): Promise<HTMLElement> => {
  const canvas = within(canvasElement);
  const editor = await canvas.findByTestId('agentBuilderConversationInputEditor');
  await userEvent.click(editor);
  if (typeText) {
    await userEvent.type(editor, typeText);
  }

  // The supported types check answers right after mount; give it a moment before the paste.
  await new Promise((resolve) => setTimeout(resolve, 100));

  const dt = new DataTransfer();
  dt.items.add(createFileToPaste(name, sizeBytes));
  await userEvent.paste(dt);

  return editor;
};

const meta: Meta<typeof ConversationInput> = {
  title: 'Conversations/Input/Upload',
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
};
export default meta;

type Story = StoryObj<typeof ConversationInput>;

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

export const ImageLoading: Story = {
  name: 'Image - Loading',
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

export const ImageOne: Story = {
  name: 'Image - 1 Image',
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

export const ImageWithDashboard: Story = {
  name: 'Image - Dashboard + Image',
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

export const ImageDuplicateFilename: Story = {
  name: 'Image - Duplicate Filename',
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

export const ImageMultipleWithTrickyFilenames: Story = {
  name: 'Image - Multiple Images (Tricky Filenames)',
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

const createStoryBinaryAttachment = (
  name: string,
  mimeType: SupportedBinaryMimeType
): VersionedAttachment => ({
  id: 'story-binary-attachment',
  type: 'binary',
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { file_id: 'story-binary-file', name, mime_type: mimeType, text: 'Hello' },
      created_at: '2026-10-09T10:00:00.000Z',
      content_hash: 'story-binary-hash',
    },
  ],
});

const STORY_PDF_ATTACHMENT = createStoryBinaryAttachment('invoice.pdf', 'application/pdf');

const STORY_CONVERSATION = {
  id: 'story-conversation',
  agent_id: 'elastic-ai-agent',
  user: { id: 'story-user', username: 'story-user' },
  title: 'New conversation',
  created_at: '2026-10-09T10:00:00.000Z',
  updated_at: '2026-10-09T10:00:00.000Z',
  rounds: [],
  attachments: [],
};

const READING_TIME_MS = 800;
const readsBinary = () =>
  new Promise<VersionedAttachment>((resolve) =>
    setTimeout(() => resolve(STORY_PDF_ATTACHMENT), READING_TIME_MS)
  );
const neverReadsBinary = () => new Promise<VersionedAttachment>(() => {});

const createBinaryStoryServices = ({
  create = readsBinary,
  supportedMimeTypes = [...SUPPORTED_BINARY_MIME_TYPES],
  filesClient,
}: {
  create?: () => Promise<VersionedAttachment>;
  supportedMimeTypes?: SupportedBinaryMimeType[];
  filesClient?: unknown;
}) => {
  const defaults = createStorybookAgentBuilderServices();
  // Keeps the real attachment types of the storybook service and replaces only the calls.
  const binaryAttachmentsService = Object.assign(Object.create(defaults.attachmentsService), {
    create,
    delete: () => Promise.resolve(),
    getSupportedBinaryMimeTypes: () => Promise.resolve(supportedMimeTypes),
  });
  return {
    binaryFilesClient: (filesClient ?? defaults.filesClient) as typeof defaults.binaryFilesClient,
    attachmentsService: binaryAttachmentsService,
    conversationsService: { create: () => Promise.resolve(STORY_CONVERSATION) } as never,
  };
};

/** Gives a file story its own query cache, so the supported types answer does not carry over, and shows toasts. */
const BinaryStoryProvider: React.FC<{
  services: ReturnType<typeof createBinaryStoryServices>;
  children: React.ReactNode;
}> = ({ services, children }) => {
  const [toasts, setToasts] = useState<EuiGlobalToastListToast[]>([]);
  const queryClient = useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    []
  );
  const kibanaServices = useMemo(() => {
    const base = createStorybookKibanaServices();
    base.notifications.toasts.addDanger = (input) => {
      const title = typeof input === 'string' ? input : String(input.title);
      setToasts((current) => [
        ...current,
        { id: `${current.length}`, title, color: 'danger' as const },
      ]);
      return {} as never;
    };
    return base;
  }, []);

  return (
    <>
      <AgentBuilderStorybookProvider
        services={services}
        queryClient={queryClient}
        kibanaServices={kibanaServices}
      >
        {children}
      </AgentBuilderStorybookProvider>
      <EuiGlobalToastList
        toasts={toasts}
        dismissToast={({ id }) => setToasts((current) => current.filter((t) => t.id !== id))}
        toastLifeTimeMs={60000}
      />
    </>
  );
};

const withBinaryServices = (options: Parameters<typeof createBinaryStoryServices>[0] = {}) => [
  (Story: React.ComponentType) => (
    <BinaryStoryProvider services={createBinaryStoryServices(options)}>
      <Story />
    </BinaryStoryProvider>
  ),
];

export const PdfLoading: Story = {
  name: 'PDF - Loading',
  decorators: withBinaryServices({
    create: neverReadsBinary,
    filesClient: neverResolvingFilesClient,
  }),
  play: async ({ canvasElement }) => {
    await pasteFile(canvasElement, { name: 'invoice.pdf' });
  },
};

export const PdfOne: Story = {
  name: 'PDF - 1 PDF',
  decorators: withBinaryServices(),
  play: async ({ canvasElement }) => {
    await pasteFile(canvasElement, { name: 'invoice.pdf', typeText: 'Summarize this: ' });
  },
};

export const TextFileMarkdown: Story = {
  name: 'Text file - Markdown',
  decorators: withBinaryServices(),
  play: async ({ canvasElement }) => {
    await pasteFile(canvasElement, { name: 'notes.md', typeText: 'Summarize this: ' });
  },
};

export const TextFileTooLarge: Story = {
  name: 'Text file - Too large',
  decorators: withBinaryServices(),
  play: async ({ canvasElement }) => {
    await pasteFile(canvasElement, { name: 'huge.txt', sizeBytes: MAX_TEXT_FILE_BYTES + 1 });
  },
};

export const FilesPdfAndTextFiles: Story = {
  name: 'Files - 1 PDF + 2 text files',
  decorators: withBinaryServices(),
  play: async ({ canvasElement }) => {
    await pasteFile(canvasElement, { name: 'invoice.pdf', typeText: 'Compare these: ' });
    await pasteFile(canvasElement, { name: 'notes.md' });
    await pasteFile(canvasElement, { name: 'data.csv' });
  },
};

export const PdfWithImage: Story = {
  name: 'PDF - Image + PDF',
  decorators: withBinaryServices(),
  play: async ({ canvasElement }) => {
    await pasteImage(canvasElement, { name: 'chart.png' });
    await pasteFile(canvasElement, { name: 'invoice.pdf' });
  },
};

export const FilesLimitReached: Story = {
  name: 'Files - 11th file refused',
  decorators: withBinaryServices(),
  play: async ({ canvasElement }) => {
    for (let index = 1; index <= MAX_FILES_PER_MESSAGE + 1; index++) {
      await pasteFile(canvasElement, { name: `notes-${index}.md` });
    }
  },
};

export const PdfTooLarge: Story = {
  name: 'PDF - Too large',
  decorators: withBinaryServices(),
  play: async ({ canvasElement }) => {
    await pasteFile(canvasElement, {
      name: 'huge.pdf',
      sizeBytes: MAX_BINARY_BYTES['application/pdf'] + 1,
    });
  },
};

export const PdfServerError: Story = {
  name: 'PDF - Server error',
  decorators: withBinaryServices({
    create: () => Promise.reject(new Error('Could not read the PDF. Try again later.')),
  }),
  play: async ({ canvasElement }) => {
    await pasteFile(canvasElement, { name: 'invoice.pdf' });
  },
};

export const PdfNotAvailable: Story = {
  name: 'PDF - Not supported',
  decorators: withBinaryServices({ supportedMimeTypes: [] }),
  play: async ({ canvasElement }) => {
    await pasteFile(canvasElement, { name: 'invoice.pdf' });
  },
};

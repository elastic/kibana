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
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { MAX_PDF_BYTES } from '@kbn/agent-builder-common/attachments';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { createStorybookAgentBuilderServices } from '../../../__storybook__/agent_builder_services';
import { createStorybookKibanaServices } from '../../../__storybook__/kibana_services';
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

const MINIMAL_PDF = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >> endobj
trailer << /Root 1 0 R >>
%%EOF
`;

const createPdfFile = (name: string, sizeBytes?: number): File => {
  const padding =
    sizeBytes && sizeBytes > MINIMAL_PDF.length
      ? [new Uint8Array(sizeBytes - MINIMAL_PDF.length)]
      : [];
  return new File([MINIMAL_PDF, ...padding], name, { type: 'application/pdf' });
};

const pastePdf = async (
  canvasElement: HTMLElement,
  { name, typeText, sizeBytes }: { name: string; typeText?: string; sizeBytes?: number }
): Promise<HTMLElement> => {
  const canvas = within(canvasElement);
  const editor = await canvas.findByTestId('agentBuilderConversationInputEditor');
  await userEvent.click(editor);
  if (typeText) {
    await userEvent.type(editor, typeText);
  }

  // The availability check answers right after mount; give it a moment before the paste.
  await new Promise((resolve) => setTimeout(resolve, 100));

  const dt = new DataTransfer();
  dt.items.add(createPdfFile(name, sizeBytes));
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

const STORY_PDF_ATTACHMENT: VersionedAttachment = {
  id: 'story-pdf-attachment',
  type: 'pdf',
  current_version: 1,
  versions: [
    {
      version: 1,
      data: { file_id: 'story-pdf-file', name: 'invoice.pdf', text: 'Hello' },
      created_at: '2026-10-09T10:00:00.000Z',
      content_hash: 'story-pdf-hash',
    },
  ],
};

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
const readsPdf = () =>
  new Promise<VersionedAttachment>((resolve) =>
    setTimeout(() => resolve(STORY_PDF_ATTACHMENT), READING_TIME_MS)
  );
const neverReadsPdf = () => new Promise<VersionedAttachment>(() => {});

const createPdfStoryServices = ({
  create = readsPdf,
  isAvailable = true,
  filesClient,
}: {
  create?: () => Promise<VersionedAttachment>;
  isAvailable?: boolean;
  filesClient?: unknown;
}) => {
  const defaults = createStorybookAgentBuilderServices();
  // Keeps the real attachment types of the storybook service and replaces only the calls.
  const pdfAttachmentsService = Object.assign(Object.create(defaults.attachmentsService), {
    create,
    delete: () => Promise.resolve(),
    isPdfAvailable: () => Promise.resolve(isAvailable),
  });
  return {
    pdfFilesClient: (filesClient ?? defaults.filesClient) as typeof defaults.pdfFilesClient,
    attachmentsService: pdfAttachmentsService,
    conversationsService: { create: () => Promise.resolve(STORY_CONVERSATION) } as never,
  };
};

/** Gives a PDF story its own query cache, so the availability answer does not carry over, and shows toasts. */
const PdfStoryProvider: React.FC<{
  services: ReturnType<typeof createPdfStoryServices>;
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

const withPdfServices = (options: Parameters<typeof createPdfStoryServices>[0] = {}) => [
  (Story: React.ComponentType) => (
    <PdfStoryProvider services={createPdfStoryServices(options)}>
      <Story />
    </PdfStoryProvider>
  ),
];

export const PdfLoading: Story = {
  name: 'PDF - Loading',
  decorators: withPdfServices({ create: neverReadsPdf, filesClient: neverResolvingFilesClient }),
  play: async ({ canvasElement }) => {
    await pastePdf(canvasElement, { name: 'invoice.pdf' });
  },
};

export const PdfOne: Story = {
  name: 'PDF - 1 PDF',
  decorators: withPdfServices(),
  play: async ({ canvasElement }) => {
    await pastePdf(canvasElement, { name: 'invoice.pdf', typeText: 'Summarize this: ' });
  },
};

export const PdfWithImage: Story = {
  name: 'PDF - Image + PDF',
  decorators: withPdfServices(),
  play: async ({ canvasElement }) => {
    await pasteImage(canvasElement, { name: 'chart.png' });
    await pastePdf(canvasElement, { name: 'invoice.pdf' });
  },
};

export const PdfSecondRefused: Story = {
  name: 'PDF - Second PDF refused',
  decorators: withPdfServices(),
  play: async ({ canvasElement }) => {
    await pastePdf(canvasElement, { name: 'invoice.pdf' });
    await pastePdf(canvasElement, { name: 'contract.pdf' });
  },
};

export const PdfTooLarge: Story = {
  name: 'PDF - Too large',
  decorators: withPdfServices(),
  play: async ({ canvasElement }) => {
    await pastePdf(canvasElement, { name: 'huge.pdf', sizeBytes: MAX_PDF_BYTES + 1 });
  },
};

export const PdfServerError: Story = {
  name: 'PDF - Server error',
  decorators: withPdfServices({
    create: () => Promise.reject(new Error('Could not read the PDF. Try again later.')),
  }),
  play: async ({ canvasElement }) => {
    await pastePdf(canvasElement, { name: 'invoice.pdf' });
  },
};

export const PdfNotAvailable: Story = {
  name: 'PDF - Not available',
  decorators: withPdfServices({ isAvailable: false }),
  play: async ({ canvasElement }) => {
    await pastePdf(canvasElement, { name: 'invoice.pdf' });
  },
};

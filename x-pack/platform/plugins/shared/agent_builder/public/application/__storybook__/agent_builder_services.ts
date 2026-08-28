/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  AttachmentType,
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
} from '@kbn/agent-builder-common/attachments';
import type { ImageAttachmentData, UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import { AttachmentsService } from '../../services/attachments';
import type { AgentBuilderInternalService } from '../../services/types';
import { createStorybookKibanaServices } from './kibana_services';

const noOp = () => {};

let fileIdCounter = 0;
/** fileId -> object URL of the actually-uploaded blob, so Storybook thumbnails show the real pasted image. */
const storybookFileBlobUrls = new Map<string, string>();
/** Fake filesClient — create resolves immediately, upload resolves after 800ms so the spinner is visible in Storybook. */
const storybookFilesClient = {
  create: () => Promise.resolve({ file: { id: `storybook-file-${++fileIdCounter}` } }),
  upload: ({ id, body }: { id: string; body: Blob }) =>
    new Promise<void>((resolve) => {
      storybookFileBlobUrls.set(id, URL.createObjectURL(body));
      setTimeout(resolve, 800);
    }),
  list: () => Promise.resolve({ files: [], total: 0 }),
  get: () => Promise.resolve({ file: null }),
  getDownloadHref: () => '',
  delete: () => Promise.resolve(),
  update: () => Promise.resolve({ file: null }),
  getMetrics: () => Promise.resolve({}),
  publicDownload: () => Promise.resolve(),
} as never;

const kibanaServices = createStorybookKibanaServices();

const storybookAttachmentsService = new AttachmentsService({
  http: kibanaServices.http as never,
});

type StorybookImageAttachment = UnknownAttachment & { data: ImageAttachmentData };
const storybookImageAttachmentDefinition: AttachmentUIDefinition<StorybookImageAttachment> = {
  getLabel: (attachment) => attachment.data.name ?? 'Image',
  getIcon: () => 'image',
  getThumbnail: (attachment) => {
    const { file_id: fileId } = attachment.data;
    if (!fileId) return undefined;
    return (
      storybookFileBlobUrls.get(fileId) ??
      kibanaServices.http.basePath.prepend(
        `/api/files/files/${CHAT_ATTACHMENT_IMAGES_FILE_KIND}/${fileId}/blob`
      )
    );
  },
};
storybookAttachmentsService.addAttachmentType(
  AttachmentType.image,
  storybookImageAttachmentDefinition
);

const defaultServices: AgentBuilderInternalService = {
  filesClient: storybookFilesClient,
  agentService: {
    list: () =>
      Promise.resolve([
        {
          id: agentBuilderDefaultAgentId,
          type: 'chat' as const,
          name: 'Elastic AI Agent',
          description: '',
        },
      ]),
    get: () => Promise.resolve(null),
    create: () => Promise.resolve({} as never),
    update: () => Promise.resolve({} as never),
    delete: () => Promise.resolve({} as never),
  } as never,
  attachmentsService: storybookAttachmentsService,
  renderersService: {} as never,
  chatService: {} as never,
  conversationsService: {} as never,
  conversationTemplatesService: {} as never,
  docLinksService: {} as never,
  navigationService: {} as never,
  toolsService: {} as never,
  skillsService: {} as never,
  smlService: {} as never,
  spaceSettingsService: {} as never,
  pluginsService: {} as never,
  oauthClientsService: {} as never,
  startDependencies: {} as never,
  accessChecker: {} as never,
  eventsService: { track: noOp } as never,
  isEarsEnabled: false,
  isEarsExperimentalEnabled: false,
  openSidebarConversation: () => ({} as never),
};

export const createStorybookAgentBuilderServices = (
  overrides?: Partial<AgentBuilderInternalService>
): AgentBuilderInternalService =>
  overrides ? { ...defaultServices, ...overrides } : defaultServices;

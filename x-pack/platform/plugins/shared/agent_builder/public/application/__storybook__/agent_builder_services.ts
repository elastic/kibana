/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  AttachmentType,
  AGENT_BUILDER_IMAGE_FILE_KIND,
} from '@kbn/agent-builder-common/attachments';
import type { ImageAttachmentData, UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser';
import { AttachmentsService } from '../../services/attachments';
import type { AgentBuilderInternalService } from '../../services/types';
import { createStorybookKibanaServices } from './kibana_services';

const noOp = () => {};

let fileIdCounter = 0;
/** Fake filesClient — create resolves immediately, upload resolves after 800ms so the spinner is visible in Storybook. */
const storybookFilesClient = {
  create: () => Promise.resolve({ file: { id: `storybook-file-${++fileIdCounter}` } }),
  upload: () => new Promise<void>((resolve) => setTimeout(resolve, 800)),
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

// The agent_builder_platform plugin registers the image attachment definition in its start()
// lifecycle, which never runs in Storybook. Register a matching one here so image pills resolve
// getThumbnail. The blob URL is turned into a solid placeholder image by kibana_services'
// mocked basePath.prepend.
type StorybookImageAttachment = UnknownAttachment & { data: ImageAttachmentData };
const storybookImageAttachmentDefinition: AttachmentUIDefinition<StorybookImageAttachment> = {
  getLabel: (attachment) => attachment.data.name ?? 'Image',
  getIcon: () => 'image',
  getThumbnail: (attachment) => {
    const { file_id: fileId } = attachment.data;
    if (!fileId) return undefined;
    return kibanaServices.http.basePath.prepend(
      `/api/files/files/${AGENT_BUILDER_IMAGE_FILE_KIND}/${fileId}/blob`
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
  docLinksService: {} as never,
  navigationService: {} as never,
  toolsService: {} as never,
  skillsService: {} as never,
  smlService: {} as never,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EMPTY } from 'rxjs';
import { EuiCodeBlock, EuiPanel, EuiText } from '@elastic/eui';
import { agentBuilderDefaultAgentId, type AgentDefinition } from '@kbn/agent-builder-common';
import {
  AttachmentType,
  CHAT_ATTACHMENT_IMAGES_FILE_KIND,
} from '@kbn/agent-builder-common/attachments';
import type { ImageAttachmentData, UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentUIDefinition,
  ConversationEventUIDefinition,
} from '@kbn/agent-builder-browser';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import { AttachmentsService } from '../../services/attachments';
import { ConversationEventsService } from '../../services/conversation_events';
import type { AgentBuilderInternalService } from '../../services/types';
import { createStorybookKibanaServices } from './kibana_services';

const noOp = () => {};

/** The agent the timeline stories draw turns for; in the app the connector fetches it. */
export const storyAgent: AgentDefinition = {
  id: agentBuilderDefaultAgentId,
  type: 'chat',
  name: 'Elastic AI Agent',
  description: '',
  readonly: true,
  configuration: {
    tools: [],
  },
};

let fileIdCounter = 0;
const storybookFileBlobUrls = new Map<string, string>();
const storybookFilesClient = {
  create: () => Promise.resolve({ file: { id: `storybook-file-${++fileIdCounter}` } }),
  upload: ({ id, body }: { id: string; body: Blob }) =>
    new Promise<void>((resolve) => {
      storybookFileBlobUrls.set(id, URL.createObjectURL(body));
      setTimeout(resolve, 400);
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

/**
 * Type of the attachment the inline-card stories use. Mirrors the platform's text type, which
 * lives in a plugin this one cannot import: a code block body and a Copy action, since the card
 * header only draws when the type has at least one action.
 */
export const STORY_INLINE_ATTACHMENT_TYPE = 'story_inline';

type StorybookInlineAttachment = UnknownAttachment & { data: { text: string } };
const storybookInlineAttachmentDefinition: AttachmentUIDefinition<StorybookInlineAttachment> = {
  getLabel: () => 'Text',
  getIcon: () => 'document',
  // Shows the previous version struck through above the current one, so a story for a later
  // version proves the diff base reaches the renderer.
  renderInlineContent: ({ attachment }) => {
    const previousText = (attachment.versionData?.previousVersionData as { text?: string })?.text;
    return React.createElement(
      React.Fragment,
      null,
      previousText &&
        React.createElement(
          EuiText,
          { size: 's', color: 'subdued', style: { padding: '8px 12px 0' } },
          React.createElement(
            'p',
            null,
            'Previously: ',
            React.createElement('del', null, previousText)
          )
        ),
      React.createElement(
        EuiCodeBlock,
        { language: 'text', fontSize: 's', overflowHeight: 300 },
        attachment.data.text
      )
    );
  },
  getActionButtons: ({ attachment }) => [
    {
      label: 'Copy',
      icon: 'copy',
      type: ActionButtonType.PRIMARY,
      handler: async () => {
        await navigator.clipboard.writeText(attachment.data.text);
      },
    },
  ],
};
storybookAttachmentsService.addAttachmentType(
  STORY_INLINE_ATTACHMENT_TYPE,
  storybookInlineAttachmentDefinition
);

/**
 * Custom event type the timeline stories use. Mirrors the platform's `text_note` type, which lives
 * in a plugin this one cannot import.
 */
export const STORY_CUSTOM_EVENT_TYPE = 'story_note';

export const storyNoteEventDefinition: ConversationEventUIDefinition = {
  type: STORY_CUSTOM_EVENT_TYPE,
  render: (event) => {
    const { title, text } = event.data as { title?: string; text: string };
    return React.createElement(
      EuiPanel,
      { paddingSize: 's', hasShadow: false, hasBorder: true },
      React.createElement(
        EuiText,
        { size: 's' },
        title && React.createElement('h4', null, title),
        React.createElement('p', null, text)
      )
    );
  },
};

/** Same as {@link STORY_CUSTOM_EVENT_TYPE}, with the framework header drawn from `getHeader`. */
export const STORY_CUSTOM_EVENT_WITH_HEADER_TYPE = 'story_note_with_header';

const storyNoteWithHeaderEventDefinition: ConversationEventUIDefinition = {
  ...storyNoteEventDefinition,
  type: STORY_CUSTOM_EVENT_WITH_HEADER_TYPE,
  getHeader: () => ({ icon: 'document', iconTitle: 'Note', label: 'Note' }),
};

const storybookConversationEventsService = new ConversationEventsService();
storybookConversationEventsService.register(storyNoteEventDefinition);
storybookConversationEventsService.register(storyNoteWithHeaderEventDefinition);

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
  conversationEventsService: storybookConversationEventsService,
  renderersService: {} as never,
  chatService: {} as never,
  conversationsService: {} as never,
  conversationTemplatesService: {} as never,
  docLinksService: {} as never,
  navigationService: {} as never,
  toolsService: {} as never,
  skillsService: {
    list: () => Promise.resolve([]),
    listByAgent: () => Promise.resolve([]),
    get: () => Promise.resolve(null),
  } as never,
  smlService: {
    autocomplete: () => Promise.resolve({ results: [] }),
    search: () => Promise.resolve({ results: [] }),
  } as never,
  spaceSettingsService: {
    get: () => Promise.resolve({ default_agent_id: null }),
    set: (defaultAgentId: string | null) => Promise.resolve({ default_agent_id: defaultAgentId }),
  } as never,
  pluginsService: {} as never,
  oauthClientsService: {} as never,
  startDependencies: { data: { search: { search: () => EMPTY } } } as never,
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

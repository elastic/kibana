/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';

export const customContentContextAttachmentUiDefinition: AttachmentUIDefinition<
  Attachment<typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE, CustomContentContextAttachmentData>
> = {
  getLabel: (attachment) =>
    attachment.data.panel_title ||
    i18n.translate('xpack.customContent.agentRefine.contextAttachmentLabel', {
      defaultMessage: 'Custom content panel',
    }),
  getIcon: () => 'sparkles',
};

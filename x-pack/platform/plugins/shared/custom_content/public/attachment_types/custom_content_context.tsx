/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';
import { RenderPanelContext } from './render_panel_context';

export const customContentContextAttachmentUiDefinition: AttachmentUIDefinition<
  Attachment<typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE, CustomContentContextAttachmentData>
> = {
  getLabel: (attachment) =>
    attachment.data.panel_title ||
    i18n.translate('xpack.customContent.agentRefine.contextAttachmentLabel', {
      defaultMessage: 'Custom panel',
    }),
  getIcon: () => 'sparkles',
  renderInlineContent: ({ attachment }) => <RenderPanelContext data={attachment.data} />,
  getActionButtons: ({ attachment, isCanvas }) => {
    if (isCanvas) return [];

    return [
      {
        label: i18n.translate('xpack.customContent.agentRefine.previewActionLabel', {
          defaultMessage: 'Preview',
        }),
        icon: 'eye',
        type: ActionButtonType.SECONDARY,
        handler: async () => {
          const { handlePanelPreview } = await import('./handle_panel_preview');
          // `attachment.data` is the version the render tag selected, so this applies whichever
          // version's card was clicked — that is what makes stepping through history work.
          handlePanelPreview(attachment.data);
        },
      },
    ];
  },
};

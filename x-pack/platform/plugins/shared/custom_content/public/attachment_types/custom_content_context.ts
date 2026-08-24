/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type {
  CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE,
  CustomContentContextAttachmentData,
} from '../../common/panel_context_attachment';
import { previewPanelVersion } from '../utils/panel_preview_registry';
import { getServices } from '../services';

const previewLabel = i18n.translate('xpack.customContent.agentRefine.previewActionLabel', {
  defaultMessage: 'Preview',
});

const panelUnavailableTitle = i18n.translate(
  'xpack.customContent.agentRefine.panelUnavailableTitle',
  { defaultMessage: 'Panel is no longer open' }
);

const panelUnavailableText = i18n.translate(
  'xpack.customContent.agentRefine.panelUnavailableText',
  {
    defaultMessage: 'Open the dashboard containing this panel to preview this version.',
  }
);

export const customContentContextAttachmentUiDefinition: AttachmentUIDefinition<
  Attachment<typeof CUSTOM_CONTENT_CONTEXT_ATTACHMENT_TYPE, CustomContentContextAttachmentData>
> = {
  getLabel: (attachment) =>
    attachment.data.panel_title ||
    i18n.translate('xpack.customContent.agentRefine.contextAttachmentLabel', {
      defaultMessage: 'Custom content panel',
    }),
  getIcon: () => 'sparkles',
  getActionButtons: ({ attachment, isCanvas }) => {
    if (isCanvas) return [];

    return [
      {
        label: previewLabel,
        icon: 'eye',
        type: ActionButtonType.SECONDARY,
        handler: () => {
          // `attachment.data` is the version selected by the render tag, so this applies whichever
          // version's card was clicked — that is what makes stepping through history work.
          if (previewPanelVersion(attachment.data)) return;
          getServices().core.notifications.toasts.addWarning({
            title: panelUnavailableTitle,
            text: panelUnavailableText,
          });
        },
      },
    ];
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { AI_PANEL_CONTEXT_ATTACHMENT_TYPE } from '../../common/panel_context_attachment';
import { type AiPanelContextAttachmentData } from '../../common/panel_context_attachment';

const MAX_LABEL_INSTRUCTIONS_LENGTH = 40;

const truncate = (text: string, maxLength: number): string =>
  text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;

export const aiPanelContextAttachmentUiDefinition: AttachmentUIDefinition<
  Attachment<typeof AI_PANEL_CONTEXT_ATTACHMENT_TYPE, AiPanelContextAttachmentData>
> = {
  getLabel: (attachment) => {
    const instructions = attachment.data.panel_instructions.trim();
    if (!instructions) {
      return i18n.translate('xpack.aiPanel.agentRefine.contextAttachmentLabel', {
        defaultMessage: 'This panel',
      });
    }
    return i18n.translate('xpack.aiPanel.agentRefine.contextAttachmentLabelWithPrompt', {
      defaultMessage: 'Panel: {instructions}',
      values: { instructions: truncate(instructions, MAX_LABEL_INSTRUCTIONS_LENGTH) },
    });
  },
  getIcon: () => 'sparkles',
};

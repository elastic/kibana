/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { EPISODE_ATTACHMENT_TYPE, type EpisodeAttachmentData } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { EpisodeInlineContent } from './episode_inline_content';
import { EpisodeCanvasContent } from './episode_canvas_content';

export { EPISODE_ATTACHMENT_TYPE };

export type EpisodeAttachment = Attachment<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData>;

export const createEpisodeAttachmentDefinition = (): AttachmentUIDefinition<EpisodeAttachment> => ({
  getLabel: (attachment) =>
    attachment.data?.['episode.id'] ||
    attachment.origin ||
    i18n.translate('xpack.alertingV2.episodeAttachment.fallbackLabel', {
      defaultMessage: 'Alert episode',
    }),
  getIcon: () => 'bell',

  canvasWidth: '40vw',

  renderInlineContent: (props) => <EpisodeInlineContent {...props} />,

  renderCanvasContent: (props) => <EpisodeCanvasContent {...props} />,

  getActionButtons: ({ openCanvas, isCanvas }) => {
    if (isCanvas) return [];
    return [
      {
        label: i18n.translate('xpack.alertingV2.episodeAttachment.preview', {
          defaultMessage: 'Preview',
        }),
        icon: 'eye',
        type: ActionButtonType.SECONDARY,
        handler: () => openCanvas?.(),
      },
    ];
  },
});

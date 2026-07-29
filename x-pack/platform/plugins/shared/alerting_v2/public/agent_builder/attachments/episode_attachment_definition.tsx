/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { EPISODE_ATTACHMENT_TYPE, type EpisodeAttachmentData } from '@kbn/alerting-v2-schemas';
import { EpisodeInlineContent } from './episode_inline_content';

export type EpisodeAttachment = Attachment<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData>;

export const createEpisodeAttachmentDefinition =
  (): AttachmentUIDefinition<EpisodeAttachment> => ({
    getLabel: (attachment) =>
      `Episode ${attachment.data.episode_id.slice(0, 8)} (${attachment.data.episode_status})`,
    getIcon: () => 'alert',

    renderInlineContent: (props) => <EpisodeInlineContent {...props} />,
  });

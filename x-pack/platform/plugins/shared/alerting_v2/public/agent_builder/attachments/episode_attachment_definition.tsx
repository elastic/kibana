/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { EPISODE_ATTACHMENT_TYPE, type EpisodeAttachmentData } from '@kbn/alerting-v2-schemas';
import { getEpisodeAttachmentLabel } from './get_episode_attachment_label';

export { EPISODE_ATTACHMENT_TYPE };

export type EpisodeAttachment = Attachment<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData>;

export const createEpisodeAttachmentDefinition = (): AttachmentUIDefinition<EpisodeAttachment> => ({
  getLabel: (attachment) => getEpisodeAttachmentLabel(attachment),
  getIcon: () => 'bell',
});

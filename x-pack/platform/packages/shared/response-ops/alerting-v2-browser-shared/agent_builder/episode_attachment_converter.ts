/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { EPISODE_ATTACHMENT_TYPE, type EpisodeAttachmentData } from '@kbn/alerting-v2-schemas';
import { alertEpisodeToEpisodeAttachment } from '@kbn/alerting-v2-utils';
import type { AttachmentConverter, FocusedEpisode } from './types';

export const episodeAttachmentConverter: AttachmentConverter<FocusedEpisode> = {
  toAttachment: (
    focused
  ): AttachmentInput<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData> => ({
    id: `episode:${focused.episode['episode.id']}`,
    type: EPISODE_ATTACHMENT_TYPE,
    origin: focused.episode['episode.id'],
    data: alertEpisodeToEpisodeAttachment(focused.episode, {
      ruleName: focused.ruleName,
      groupingFields: focused.groupingFields,
    }),
  }),
  getOrigin: (focused) => focused.episode['episode.id'],
};

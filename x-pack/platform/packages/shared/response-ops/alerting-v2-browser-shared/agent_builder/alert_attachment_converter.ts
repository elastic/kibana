/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { ALERT_ATTACHMENT_TYPE, type AlertAttachmentData } from '@kbn/alerting-v2-schemas';
import { alertEpisodeToAlertAttachment } from '@kbn/alerting-v2-utils';
import type { AttachmentConverter, FocusedEpisode } from './types';

export const alertAttachmentConverter: AttachmentConverter<FocusedEpisode> = {
  toAttachment: (
    focused
  ): AttachmentInput<typeof ALERT_ATTACHMENT_TYPE, AlertAttachmentData> => ({
    id: `alert:${focused.episode['episode.id']}`,
    type: ALERT_ATTACHMENT_TYPE,
    origin: focused.episode['episode.id'],
    data: alertEpisodeToAlertAttachment(focused.episode, {
      ruleName: focused.ruleName,
      groupingFields: focused.groupingFields,
    }),
  }),
  getOrigin: (focused) => focused.episode['episode.id'],
};

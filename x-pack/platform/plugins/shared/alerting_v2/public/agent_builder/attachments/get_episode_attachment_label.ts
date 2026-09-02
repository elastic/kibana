/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeAttachmentData } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';

export const getEpisodeAttachmentLabel = (
  attachment: Partial<Pick<{ data: EpisodeAttachmentData }, 'data'>>
): string =>
  attachment.data?.['episode.label'] ??
  i18n.translate('xpack.alertingV2.episodeAttachment.fallbackLabel', {
    defaultMessage: 'Alert episode',
  });

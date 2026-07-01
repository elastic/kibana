/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMetadataItems, AppHeaderMetadataTextItem } from '@kbn/app-header';
import * as i18n from '../translations';

export interface EpisodeHeaderMetadataArgs {
  triggeredAt: string | undefined;
  durationMs: number | undefined;
  formatDate: (isoDate: string) => string;
}

export const getEpisodeHeaderMetadata = ({
  triggeredAt,
  durationMs,
  formatDate,
}: EpisodeHeaderMetadataArgs): AppHeaderMetadataItems | undefined => {
  const items: AppHeaderMetadataTextItem[] = [];

  if (triggeredAt) {
    items.push({
      type: 'text',
      label: i18n.TRIGGERED_LABEL,
      value: formatDate(triggeredAt),
      'data-test-subj': 'alertingV2EpisodeDetailsHeaderTriggeredMetadata',
    });
  }

  if (typeof durationMs === 'number') {
    items.push({
      type: 'text',
      label: i18n.DURATION_LABEL,
      value: i18n.FORMAT_EPISODE_DURATION_MS(durationMs),
      'data-test-subj': 'alertingV2EpisodeDetailsHeaderDurationMetadata',
    });
  }

  if (items.length === 0) {
    return undefined;
  }

  return items as unknown as AppHeaderMetadataItems;
};

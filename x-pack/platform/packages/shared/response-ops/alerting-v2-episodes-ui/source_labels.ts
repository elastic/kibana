/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERTING_V2_EPISODE_SOURCE_ID } from './constants';
import { CLASSIC_EPISODE_SOURCE_ID } from './classic_alerts/constants';
import { useAdditionalEpisodesDataSource } from './context/episode_data_source_context';
import type { EpisodeDataSource } from './types/episode_data_source';

export const CLASSIC_ALERTING_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.source.classicAlertingLabel',
  { defaultMessage: 'Classic alerting' }
);

export const UNIVERSAL_ALERTING_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.source.universalAlertingLabel',
  { defaultMessage: 'Universal alerting' }
);

export const getEpisodeSourceLabel = (
  sourceId?: string,
  sources?: ReadonlyArray<Pick<EpisodeDataSource, 'id' | 'label'>>
): string => {
  if (sourceId != null && sources) {
    const match = sources.find((source) => source.id === sourceId);
    if (match?.label) {
      return match.label;
    }
  }
  if (sourceId == null || sourceId === ALERTING_V2_EPISODE_SOURCE_ID) {
    return UNIVERSAL_ALERTING_LABEL;
  }
  if (sourceId === CLASSIC_EPISODE_SOURCE_ID) {
    return CLASSIC_ALERTING_LABEL;
  }
  return sourceId;
};

export const ELASTIC_SOURCE_ICON: IconType = 'logoElastic';

export const getEpisodeSourceIcon = (
  sourceId?: string,
  sources?: ReadonlyArray<Pick<EpisodeDataSource, 'id' | 'icon'>>
): IconType | undefined => {
  if (sourceId != null) {
    const match = sources?.find((source) => source.id === sourceId);
    if (match) {
      return match.icon;
    }
  }
  return sourceId == null || sourceId === ALERTING_V2_EPISODE_SOURCE_ID
    ? ELASTIC_SOURCE_ICON
    : undefined;
};

export const useEpisodeSource = (sourceId?: string): { label: string; icon?: IconType } => {
  const dataSource = useAdditionalEpisodesDataSource();
  const sources = dataSource ? [dataSource] : undefined;
  return {
    label: getEpisodeSourceLabel(sourceId, sources),
    icon: getEpisodeSourceIcon(sourceId, sources),
  };
};

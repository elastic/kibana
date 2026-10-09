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

export const CLASSIC_SOURCE_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.source.classicLabel',
  { defaultMessage: 'Classic' }
);

export const UNIVERSAL_SOURCE_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.source.universalLabel',
  { defaultMessage: 'Universal' }
);

export const CLASSIC_ALERTING_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.source.classicAlertingLabel',
  { defaultMessage: 'Classic Alerting' }
);

export const UNIVERSAL_ALERTING_LABEL = i18n.translate(
  'xpack.alertingV2EpisodesUi.source.universalAlertingLabel',
  { defaultMessage: 'Universal Alerting' }
);

export const CLASSIC_ALERTING_SYSTEM_NAME = i18n.translate(
  'xpack.alertingV2EpisodesUi.source.classicAlertingSystemName',
  { defaultMessage: 'Kibana Classic Alerting' }
);

export const UNIVERSAL_ALERTING_SYSTEM_NAME = i18n.translate(
  'xpack.alertingV2EpisodesUi.source.universalAlertingSystemName',
  { defaultMessage: 'Kibana Universal Alerting' }
);

const resolve = <T>(
  sourceId: string | undefined,
  sources: ReadonlyArray<Pick<EpisodeDataSource, 'id' | 'label'>> | undefined,
  universal: T,
  classic: T
): T | string => {
  if (sourceId != null && sources) {
    const match = sources.find((source) => source.id === sourceId);
    if (match?.label) {
      return match.label;
    }
  }
  if (sourceId == null || sourceId === ALERTING_V2_EPISODE_SOURCE_ID) {
    return universal;
  }
  if (sourceId === CLASSIC_EPISODE_SOURCE_ID) {
    return classic;
  }
  return sourceId;
};

/** Short source name for the alerts table column. */
export const getEpisodeSourceLabel = (
  sourceId?: string,
  sources?: ReadonlyArray<Pick<EpisodeDataSource, 'id' | 'label'>>
): string => resolve(sourceId, sources, UNIVERSAL_SOURCE_LABEL, CLASSIC_SOURCE_LABEL);

/** Full system name for the alert details flyout badge. */
export const getEpisodeSourceSystemName = (
  sourceId?: string,
  sources?: ReadonlyArray<Pick<EpisodeDataSource, 'id' | 'label'>>
): string =>
  resolve(sourceId, sources, UNIVERSAL_ALERTING_SYSTEM_NAME, CLASSIC_ALERTING_SYSTEM_NAME);

/** Short system name used where a sentence names the failing system. */
export const getEpisodeSourceAlertingName = (
  sourceId?: string,
  sources?: ReadonlyArray<Pick<EpisodeDataSource, 'id' | 'label'>>
): string => resolve(sourceId, sources, UNIVERSAL_ALERTING_LABEL, CLASSIC_ALERTING_LABEL);

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

export const useEpisodeSource = (
  sourceId?: string
): { label: string; systemName: string; icon?: IconType } => {
  const dataSource = useAdditionalEpisodesDataSource();
  const sources = dataSource ? [dataSource] : undefined;
  return {
    label: getEpisodeSourceLabel(sourceId, sources),
    systemName: getEpisodeSourceSystemName(sourceId, sources),
    icon: getEpisodeSourceIcon(sourceId, sources),
  };
};

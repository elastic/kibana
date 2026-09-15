/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLASSIC_EPISODE_SOURCE_ID } from '../classic_alerts/constants';
import { ALERTING_V2_EPISODE_SOURCE_ID } from '../constants';
import {
  EPISODES_HISTOGRAM_FETCH_ERROR_TOAST_TITLE,
  EPISODES_HISTOGRAM_V1_FETCH_ERROR_TOAST_TITLE,
  EPISODES_HISTOGRAM_V2_FETCH_ERROR_TOAST_TITLE,
  EPISODES_KPIS_FETCH_ERROR_TOAST_TITLE,
  EPISODES_KPIS_V1_FETCH_ERROR_TOAST_TITLE,
  EPISODES_KPIS_V2_FETCH_ERROR_TOAST_TITLE,
  EPISODES_LIST_FETCH_ERROR_TOAST_TITLE,
  EPISODES_LIST_V1_FETCH_ERROR_TOAST_TITLE,
  EPISODES_LIST_V2_FETCH_ERROR_TOAST_TITLE,
} from './translations';

export type EpisodeFetchErrorSurface = 'list' | 'kpis' | 'histogram';

const TITLES: Record<
  EpisodeFetchErrorSurface,
  { readonly v1: string; readonly v2: string; readonly fallback: string }
> = {
  list: {
    v1: EPISODES_LIST_V1_FETCH_ERROR_TOAST_TITLE,
    v2: EPISODES_LIST_V2_FETCH_ERROR_TOAST_TITLE,
    fallback: EPISODES_LIST_FETCH_ERROR_TOAST_TITLE,
  },
  kpis: {
    v1: EPISODES_KPIS_V1_FETCH_ERROR_TOAST_TITLE,
    v2: EPISODES_KPIS_V2_FETCH_ERROR_TOAST_TITLE,
    fallback: EPISODES_KPIS_FETCH_ERROR_TOAST_TITLE,
  },
  histogram: {
    v1: EPISODES_HISTOGRAM_V1_FETCH_ERROR_TOAST_TITLE,
    v2: EPISODES_HISTOGRAM_V2_FETCH_ERROR_TOAST_TITLE,
    fallback: EPISODES_HISTOGRAM_FETCH_ERROR_TOAST_TITLE,
  },
};

/**
 * Toast title for a dual-source fetch error, naming both surface and source.
 */
export const getEpisodesFetchErrorToastTitle = (
  surface: EpisodeFetchErrorSurface,
  sourceId: string
): string => {
  const titles = TITLES[surface];
  if (sourceId === CLASSIC_EPISODE_SOURCE_ID) {
    return titles.v1;
  }
  if (sourceId === ALERTING_V2_EPISODE_SOURCE_ID) {
    return titles.v2;
  }
  return titles.fallback;
};

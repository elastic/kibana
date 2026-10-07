/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getChartHidden,
  setChartHidden as setDiscoverChartHidden,
} from '@kbn/discover-utils';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

/** LocalStorage prefix — keeps Alerts panel prefs separate from Discover. */
export const EPISODES_PANELS_STORAGE_PREFIX = 'alertingV2Alerts';

/** DOM ids for aria-controls on panel toggle buttons. */
export const EPISODES_KPIS_PANEL_ID = 'episodesKpisCollapsablePanel';
export const EPISODES_HISTOGRAM_PANEL_ID = 'episodesHistogramCollapsablePanel';

const KPIS_HIDDEN_KEY = `${EPISODES_PANELS_STORAGE_PREFIX}:kpisHidden`;

export const getKpisHidden = (storage: Storage): boolean =>
  Boolean(storage.get(KPIS_HIDDEN_KEY));

export const setKpisHidden = (storage: Storage, kpisHidden: boolean): void => {
  storage.set(KPIS_HIDDEN_KEY, kpisHidden);
};

export const getHistogramHidden = (storage: Storage): boolean =>
  Boolean(getChartHidden(storage, EPISODES_PANELS_STORAGE_PREFIX));

export const setHistogramHidden = (storage: Storage, histogramHidden: boolean): void => {
  setDiscoverChartHidden(storage, EPISODES_PANELS_STORAGE_PREFIX, histogramHidden);
};

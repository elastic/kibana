/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { getUiSettings } from '../../../kibana_services';
import { ParsedMapStateJSON } from './types';

export function getInitialRefreshConfig({
  mapState,
  globalState = {},
}: {
  mapState?: ParsedMapStateJSON;
  globalState: GlobalQueryStateFromUrl;
}) {
  const uiSettings = getUiSettings();

  if (mapState?.refreshConfig) {
    return mapState.refreshConfig;
  }

  const defaultRefreshConfig = uiSettings.get(UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS);
  const refreshInterval = { ...defaultRefreshConfig, ...globalState.refreshInterval };
  return {
    isPaused: refreshInterval.pause,
    interval: refreshInterval.value,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { MonitoringStartPluginDependencies, MonitoringStartServices } from '../../types';

export const shouldOverrideRefreshInterval = (
  uiSettings: MonitoringStartServices['uiSettings'],
  timefilter: MonitoringStartPluginDependencies['data']['query']['timefilter']['timefilter']
): boolean => {
  const isUserDefined =
    timefilter.isRefreshIntervalTouched() ||
    !uiSettings.isDefault(UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS);
  if (isUserDefined) {
    return false;
  }

  const currentInterval = timefilter.getRefreshInterval();
  const isPaused = currentInterval.pause || currentInterval.value === 0;
  return isPaused;
};

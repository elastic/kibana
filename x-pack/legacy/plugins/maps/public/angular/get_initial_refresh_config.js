/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getUiSettings } from '../../../../../plugins/maps/public/kibana_services';

export function getInitialRefreshConfig({ mapStateJSON, globalState = {} }) {
  const uiSettings = getUiSettings();

  if (mapStateJSON) {
    const mapState = JSON.parse(mapStateJSON);
    if (mapState.refreshConfig) {
      return mapState.refreshConfig;
    }
  }

  const defaultRefreshConfig = uiSettings.get('timepicker:refreshIntervalDefaults');
  const refreshInterval = { ...defaultRefreshConfig, ...globalState.refreshInterval };
  return {
    isPaused: refreshInterval.pause,
    interval: refreshInterval.value,
  };
}

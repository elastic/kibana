/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';

const uiSettings = chrome.getUiSettingsClient();

export function getInitialRefreshConfig({ mapStateJSON, globalState = {} }) {
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

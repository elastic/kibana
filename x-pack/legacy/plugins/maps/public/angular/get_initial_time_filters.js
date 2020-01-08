/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';

const uiSettings = chrome.getUiSettingsClient();

export function getInitialTimeFilters({ mapStateJSON, globalState = {} }) {
  if (mapStateJSON) {
    const mapState = JSON.parse(mapStateJSON);
    if (mapState.timeFilters) {
      return mapState.timeFilters;
    }
  }

  const defaultTime = uiSettings.get('timepicker:timeDefaults');
  return { ...defaultTime, ...globalState.time };
}

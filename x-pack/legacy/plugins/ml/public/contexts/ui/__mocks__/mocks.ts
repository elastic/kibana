/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const uiChromeMock = {
  getBasePath: () => 'basePath',
  getUiSettingsClient: () => {
    return {
      get: (key: string) => {
        switch (key) {
          case 'dateFormat':
            return 'MMM D, YYYY @ HH:mm:ss.SSS';
          case 'theme:darkMode':
            return false;
          case 'timepicker:timeDefaults':
            return {};
          case 'timepicker:refreshIntervalDefaults':
            return { pause: false, value: 0 };
          default:
            throw new Error(`Unexpected config key: ${key}`);
        }
      },
    };
  },
};

interface RefreshInterval {
  value: number;
  pause: boolean;
}

const time = {
  from: 'Thu Aug 29 2019 02:04:19 GMT+0200',
  to: 'Sun Sep 29 2019 01:45:36 GMT+0200',
};

export const uiTimefilterMock = {
  getIsAutoRefreshSelectorEnabled() {
    return this.isAutoRefreshSelectorEnabled;
  },
  getIsTimeRangeSelectorEnabled() {
    return this.isTimeRangeSelectorEnabled;
  },
  enableAutoRefreshSelector() {
    this.isAutoRefreshSelectorEnabled = true;
  },
  enableTimeRangeSelector() {
    this.isTimeRangeSelectorEnabled = true;
  },
  getEnabledUpdated$() {
    return { subscribe: jest.fn() };
  },
  getRefreshInterval() {
    return this.refreshInterval;
  },
  getRefreshIntervalUpdate$() {
    return { subscribe: jest.fn() };
  },
  getTime: () => time,
  getTimeUpdate$() {
    return { subscribe: jest.fn() };
  },
  isAutoRefreshSelectorEnabled: false,
  isTimeRangeSelectorEnabled: false,
  refreshInterval: { value: 0, pause: true },
  on: (event: string, reload: () => void) => {},
  setRefreshInterval(refreshInterval: RefreshInterval) {
    this.refreshInterval = refreshInterval;
  },
};

export const uiTimeHistoryMock = {
  get: () => [time],
};

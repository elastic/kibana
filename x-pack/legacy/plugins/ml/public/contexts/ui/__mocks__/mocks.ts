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
            return {};
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

export const uiTimefilterMock = {
  getRefreshInterval: () => '30s',
  getTime: () => ({ from: 0, to: 0 }),
  on: (event: string, reload: () => void) => {},
};

export const uiTimeHistoryMock = {
  get: () => [{ from: 0, to: 0 }],
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const useNavigationMenuContext = () => ({
  chrome: {
    getBasePath: () => 'basePath',
    getUiSettingsClient: () => {
      return {
        get: (key: string) => {
          switch (key) {
            case 'dateFormat':
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
  },
  timefilter: {
    getRefreshInterval: () => '30s',
    getTime: () => ({ from: 0, to: 0 }),
    on: (event: string, reload: () => void) => {},
  },
  timeHistory: {
    get: () => [{ from: 0, to: 0 }],
  },
});

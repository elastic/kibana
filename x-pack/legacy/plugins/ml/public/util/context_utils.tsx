/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import { Chrome } from 'ui/chrome';
import { Timefilter } from 'ui/timefilter';
import { TimeHistory } from 'ui/timefilter/time_history';

export const ChromeContext = React.createContext<Chrome>({} as Chrome);
export const TimefilterContext = React.createContext<Timefilter>({} as Timefilter);
export const TimeHistoryContext = React.createContext<TimeHistory>({} as TimeHistory);

interface NavigationMenuContextValue {
  chrome: Chrome;
  timefilter: Timefilter;
  timeHistory: TimeHistory;
}
export const NavigationMenuContext = React.createContext<NavigationMenuContextValue>({
  chrome: {} as Chrome,
  timefilter: {} as Timefilter,
  timeHistory: {} as TimeHistory,
});

export const useNavigationMenuContext = () => {
  return useContext(NavigationMenuContext);
};

// testing mocks
export const chromeMock = {
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
} as Chrome;

export const timefilterMock = ({
  getRefreshInterval: () => '30s',
  getTime: () => ({ from: 0, to: 0 }),
  on: (event: string, reload: () => void) => {},
} as unknown) as Timefilter;

export const timeHistoryMock = ({
  get: () => [{ from: 0, to: 0 }],
} as unknown) as TimeHistory;

export const navigationMenuMock = {
  chrome: chromeMock,
  timefilter: timefilterMock,
  timeHistory: timeHistoryMock,
};

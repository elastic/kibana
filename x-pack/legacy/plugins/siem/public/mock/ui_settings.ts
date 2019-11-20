/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  DEFAULT_SIEM_TIME_RANGE,
  DEFAULT_SIEM_REFRESH_INTERVAL,
  DEFAULT_INDEX_KEY,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATE_FORMAT_TZ,
  DEFAULT_DARK_MODE,
  DEFAULT_TIME_RANGE,
  DEFAULT_REFRESH_RATE_INTERVAL,
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
} from '../../common/constants';
import { defaultIndexPattern } from '../../default_index_pattern';

chrome.getUiSettingsClient().get.mockImplementation((key: string) => {
  switch (key) {
    case DEFAULT_TIME_RANGE:
      return { from: 'now-15m', to: 'now', mode: 'quick' };
    case DEFAULT_REFRESH_RATE_INTERVAL:
      return { pause: false, value: 0 };
    case DEFAULT_SIEM_TIME_RANGE:
      return {
        from: DEFAULT_FROM,
        to: DEFAULT_TO,
      };
    case DEFAULT_SIEM_REFRESH_INTERVAL:
      return {
        pause: DEFAULT_INTERVAL_PAUSE,
        value: DEFAULT_INTERVAL_VALUE,
      };
    case DEFAULT_INDEX_KEY:
      return defaultIndexPattern;
    case DEFAULT_DATE_FORMAT_TZ:
      return 'Asia/Taipei';
    case DEFAULT_DATE_FORMAT:
      return 'MMM D, YYYY @ HH:mm:ss.SSS';
    case DEFAULT_DARK_MODE:
      return false;
    default:
      throw new Error(`Unexpected config key: ${key}`);
  }
});

export interface MockNpSetUp {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  core: { uiSettings: any };
}

type Config =
  | 'query:allowLeadingWildcards'
  | 'query:queryString:options'
  | 'courier:ignoreFilterIfFieldNotInIndex'
  | 'dateFormat:tz';

export const mockUiSettings = {
  get: (item: Config) => {
    return mockUiSettings[item];
  },
  get$: () => ({
    subscribe: jest.fn(),
  }),
  'query:allowLeadingWildcards': true,
  'query:queryString:options': {},
  'courier:ignoreFilterIfFieldNotInIndex': true,
  'dateFormat:tz': 'Browser',
};

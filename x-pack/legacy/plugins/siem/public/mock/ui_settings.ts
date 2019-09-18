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
  DEFAULT_DATE_FORMAT_TZ,
  DEFAULT_DARK_MODE,
  DEFAULT_TIME_RANGE,
  DEFAULT_REFRESH_RATE_INTERVAL,
  DEFAULT_FROM,
  DEFAULT_TO,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
} from '../../common/constants';

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
      return ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'];
    case DEFAULT_DATE_FORMAT_TZ:
      return 'Asia/Taipei';
    case DEFAULT_DARK_MODE:
      return false;
    default:
      throw new Error(`Unexpected config key: ${key}`);
  }
});

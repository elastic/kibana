/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSupportedUrlParams } from '../get_supported_url_params';
import { CLIENT_DEFAULTS } from '../../../../../common/constants';

describe('getSupportedUrlParams', () => {
  it('returns custom values', () => {
    const customValues = {
      autorefreshInterval: '23',
      autorefreshIsPaused: 'false',
      dateRangeStart: 'foo',
      dateRangeEnd: 'bar',
      search: 'monitor.status: down',
      selectedPingStatus: 'up',
    };
    const result = getSupportedUrlParams(customValues);
    expect(result).toEqual({
      autorefreshInterval: 23,
      autorefreshIsPaused: false,
      dateRangeStart: 'foo',
      dateRangeEnd: 'bar',
      search: 'monitor.status: down',
      selectedPingStatus: 'up',
    });
  });

  it('returns default values', () => {
    const {
      AUTOREFRESH_INTERVAL,
      AUTOREFRESH_IS_PAUSED,
      DATE_RANGE_START,
      DATE_RANGE_END,
      SEARCH,
      SELECTED_PING_LIST_STATUS,
    } = CLIENT_DEFAULTS;
    const result = getSupportedUrlParams({});
    expect(result).toEqual({
      autorefreshInterval: AUTOREFRESH_INTERVAL,
      autorefreshIsPaused: AUTOREFRESH_IS_PAUSED,
      dateRangeStart: DATE_RANGE_START,
      dateRangeEnd: DATE_RANGE_END,
      search: SEARCH,
      selectedPingStatus: SELECTED_PING_LIST_STATUS,
    });
  });
});

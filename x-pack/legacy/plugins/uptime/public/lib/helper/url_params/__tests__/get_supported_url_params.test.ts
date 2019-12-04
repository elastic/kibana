/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { getSupportedUrlParams } from '../get_supported_url_params';
import { CLIENT_DEFAULTS } from '../../../../../common/constants';

describe('getSupportedUrlParams', () => {
  let dateMathSpy: any;
  const MOCK_DATE_VALUE = 20;

  beforeEach(() => {
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(MOCK_DATE_VALUE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns custom values', () => {
    const customValues = {
      autorefreshInterval: '23',
      autorefreshIsPaused: 'false',
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      monitorListPageIndex: '23',
      monitorListPageSize: '50',
      monitorListSortDirection: 'desc',
      monitorListSortField: 'monitor.status',
      search: 'monitor.status: down',
      selectedPingStatus: 'up',
    };
    const result = getSupportedUrlParams(customValues);
    expect(result).toMatchSnapshot();
  });

  it('returns default values', () => {
    const {
      AUTOREFRESH_INTERVAL,
      AUTOREFRESH_IS_PAUSED,
      DATE_RANGE_START,
      DATE_RANGE_END,
      FILTERS,
      SEARCH,
      SELECTED_PING_LIST_STATUS,
      STATUS_FILTER,
    } = CLIENT_DEFAULTS;
    const result = getSupportedUrlParams({});
    expect(result).toMatchSnapshot();
    expect(result).toEqual({
      absoluteDateRangeStart: MOCK_DATE_VALUE,
      absoluteDateRangeEnd: MOCK_DATE_VALUE,
      autorefreshInterval: AUTOREFRESH_INTERVAL,
      autorefreshIsPaused: AUTOREFRESH_IS_PAUSED,
      dateRangeStart: DATE_RANGE_START,
      dateRangeEnd: DATE_RANGE_END,
      filters: FILTERS,
      search: SEARCH,
      selectedPingStatus: SELECTED_PING_LIST_STATUS,
      statusFilter: STATUS_FILTER,
    });
  });

  it('returns the first item for string arrays', () => {
    const result = getSupportedUrlParams({
      dateRangeStart: ['now-18d', 'now-11d', 'now-5m'],
    });
    expect(result).toMatchSnapshot();
  });

  it('provides defaults for undefined values', () => {
    const result = getSupportedUrlParams({
      dateRangeStart: undefined,
    });
    expect(result).toMatchSnapshot();
  });

  it('provides defaults for empty string array values', () => {
    const result = getSupportedUrlParams({
      dateRangeStart: [],
    });
    expect(result).toMatchSnapshot();
  });
});

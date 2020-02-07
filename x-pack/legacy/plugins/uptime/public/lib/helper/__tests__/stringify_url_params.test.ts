/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { stringifyUrlParams } from '../stringify_url_params';

describe('stringifyUrlParams', () => {
  it('creates expected string value', () => {
    const result = stringifyUrlParams({
      autorefreshInterval: 50000,
      autorefreshIsPaused: false,
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      filters: 'monitor.id: bar',
      search: 'monitor.id: foo',
      selectedPingStatus: 'down',
      statusFilter: 'up',
    });
    expect(result).toMatchSnapshot();
  });

  it('creates expected string value when ignore empty is true', () => {
    const result = stringifyUrlParams(
      {
        autorefreshInterval: 50000,
        autorefreshIsPaused: false,
        dateRangeStart: 'now-15m',
        dateRangeEnd: 'now',
        filters: 'monitor.id: bar',
        search: undefined,
        selectedPingStatus: undefined,
        statusFilter: '',
        pagination: undefined,
      },
      true
    );
    expect(result).toMatchSnapshot();

    expect(result.includes('pagination')).toBeFalsy();
    expect(result.includes('search')).toBeFalsy();
    expect(result.includes('selectedPingStatus')).toBeFalsy();
  });
});

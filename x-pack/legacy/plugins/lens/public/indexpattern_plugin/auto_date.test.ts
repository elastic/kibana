/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { autoDate } from './auto_date';

jest.mock('ui/new_platform');
jest.mock('ui/chrome');

describe('auto_date', () => {
  it('should do nothing if no time range is provided', () => {
    const result = autoDate.fn(
      {
        type: 'kibana_context',
      },
      {
        aggConfigs: 'canttouchthis',
      },
      // eslint-disable-next-line
      {} as any
    );

    expect(result).toEqual('canttouchthis');
  });

  it('should not change anything if there are no auto date histograms', () => {
    const aggConfigs = JSON.stringify([
      { type: 'date_histogram', params: { interval: '35h' } },
      { type: 'count' },
    ]);
    const result = autoDate.fn(
      {
        timeRange: {
          from: 'now-10d',
          to: 'now',
        },
        type: 'kibana_context',
      },
      {
        aggConfigs,
      },
      // eslint-disable-next-line
      {} as any
    );

    expect(result).toEqual(aggConfigs);
  });

  it('should change auto date histograms', () => {
    const aggConfigs = JSON.stringify([
      { type: 'date_histogram', params: { interval: 'auto' } },
      { type: 'count' },
    ]);
    const result = autoDate.fn(
      {
        timeRange: {
          from: 'now-10d',
          to: 'now',
        },
        type: 'kibana_context',
      },
      {
        aggConfigs,
      },
      // eslint-disable-next-line
      {} as any
    );

    const interval = JSON.parse(result).find(
      (agg: { type: string }) => agg.type === 'date_histogram'
    ).params.interval;

    expect(interval).toBeTruthy();
    expect(typeof interval).toEqual('string');
    expect(interval).not.toEqual('auto');
  });
});

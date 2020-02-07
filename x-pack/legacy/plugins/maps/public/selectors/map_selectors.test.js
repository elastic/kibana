/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../layers/vector_layer', () => {});
jest.mock('../layers/heatmap_layer', () => {});
jest.mock('../layers/vector_tile_layer', () => {});
jest.mock('../layers/sources/all_sources', () => {});
jest.mock('../reducers/non_serializable_instances', () => ({
  getInspectorAdapters: () => {
    return {};
  },
}));
jest.mock('ui/timefilter', () => ({
  timefilter: {
    getTime: () => {
      return {
        to: 'now',
        from: 'now-15m',
      };
    },
  },
}));

import { getTimeFilters } from './map_selectors';

describe('getTimeFilters', () => {
  it('should return timeFilters when contained in state', () => {
    const state = {
      map: {
        mapState: {
          timeFilters: {
            to: '2001-01-01',
            from: '2001-12-31',
          },
        },
      },
    };
    expect(getTimeFilters(state)).toEqual({ to: '2001-01-01', from: '2001-12-31' });
  });

  it('should return kibana time filters when not contained in state', () => {
    const state = {
      map: {
        mapState: {
          timeFilters: null,
        },
      },
    };
    expect(getTimeFilters(state)).toEqual({ to: 'now', from: 'now-15m' });
  });
});

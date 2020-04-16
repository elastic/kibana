/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../../../plugins/maps/public/layers/vector_layer', () => {});
jest.mock('../../../../../plugins/maps/public/layers/blended_vector_layer', () => {});
jest.mock('../../../../../plugins/maps/public/layers/heatmap_layer', () => {});
jest.mock('../../../../../plugins/maps/public/layers/vector_tile_layer', () => {});
jest.mock('../../../../../plugins/maps/public/layers/joins/inner_join', () => {});
jest.mock('../../../../../plugins/maps/public/reducers/non_serializable_instances', () => ({
  getInspectorAdapters: () => {
    return {};
  },
}));
jest.mock('../../../../../plugins/maps/public/kibana_services', () => ({
  getTimeFilter: () => ({
    getTime: () => {
      return {
        to: 'now',
        from: 'now-15m',
      };
    },
  }),
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAYER_STYLE_TYPE, LAYER_TYPE, SOURCE_TYPES } from '../../common/constants';

jest.mock('../classes/layers/heatmap_layer', () => {});
jest.mock('../classes/layers/ems_vector_tile_layer/ems_vector_tile_layer', () => {});
jest.mock('../classes/joins/inner_join', () => {});
jest.mock('../kibana_services', () => ({
  getTimeFilter: () => ({
    getTime: () => {
      return {
        to: 'now',
        from: 'now-15m',
      };
    },
  }),
  getMapsCapabilities() {
    return { save: true };
  },
  getIsDarkMode() {
    return false;
  },
  getEMSSettings() {
    return {
      isEMSUrlSet() {
        return false;
      },
    };
  },
}));

import { DEFAULT_MAP_STORE_STATE } from '../reducers/store';
import {
  isMapLoading,
  getDataFilters,
  getTimeFilters,
  getQueryableUniqueIndexPatternIds,
  getSpatialFiltersLayer,
} from './map_selectors';

import { LayerDescriptor, VectorLayerDescriptor } from '../../common/descriptor_types';
import { buildGeoShapeFilter } from '../../common/elasticsearch_util';
import { ILayer } from '../classes/layers/layer';
import { Filter } from '@kbn/es-query';
import { ESSearchSource } from '../classes/sources/es_search_source';
import { GeoJsonFileSource } from '../classes/sources/geojson_file_source';
import { getDefaultMapSettings } from '../reducers/map/default_map_settings';

describe('getDataFilters', () => {
  const mapExtent = {
    maxLat: 1,
    maxLon: 1,
    minLat: 0,
    minLon: 0,
  };
  const mapBuffer = {
    maxLat: 1.5,
    maxLon: 1.5,
    minLat: -0.5,
    minLon: -0.5,
  };
  const mapZoom = 4;
  const timeFilters = { to: '2001-01-01', from: '2001-12-31' };
  const timeslice = undefined;
  const query = undefined;
  const embeddableSearchContext = undefined;
  const filters: Filter[] = [];
  const searchSessionId = '12345';
  const searchSessionMapBuffer = {
    maxLat: 1.25,
    maxLon: 1.25,
    minLat: -0.25,
    minLon: -0.25,
  };
  const isReadOnly = false;
  const executionContext = {};

  test('should set buffer as searchSessionMapBuffer when using searchSessionId', () => {
    const dataFilters = getDataFilters.resultFunc(
      mapExtent,
      mapBuffer,
      mapZoom,
      timeFilters,
      timeslice,
      query,
      filters,
      embeddableSearchContext,
      searchSessionId,
      searchSessionMapBuffer,
      isReadOnly,
      executionContext
    );
    expect(dataFilters.buffer).toEqual(searchSessionMapBuffer);
  });

  test('should fall back to screen buffer when using searchSessionId and searchSessionMapBuffer is not provided', () => {
    const dataFilters = getDataFilters.resultFunc(
      mapExtent,
      mapBuffer,
      mapZoom,
      timeFilters,
      timeslice,
      query,
      filters,
      embeddableSearchContext,
      searchSessionId,
      undefined,
      isReadOnly,
      executionContext
    );
    expect(dataFilters.buffer).toEqual(mapBuffer);
  });
});

describe('getTimeFilters', () => {
  test('should return timeFilters when contained in state', () => {
    const state = {
      ...DEFAULT_MAP_STORE_STATE,
      map: {
        ...DEFAULT_MAP_STORE_STATE.map,
        mapState: {
          ...DEFAULT_MAP_STORE_STATE.map.mapState,
          timeFilters: {
            to: '2001-01-01',
            from: '2001-12-31',
          },
        },
      },
    };
    expect(getTimeFilters(state)).toEqual({ to: '2001-01-01', from: '2001-12-31' });
  });

  test('should return kibana time filters when not contained in state', () => {
    const state = {
      ...DEFAULT_MAP_STORE_STATE,
      map: {
        ...DEFAULT_MAP_STORE_STATE.map,
        mapState: {
          ...DEFAULT_MAP_STORE_STATE.map.mapState,
          timeFilters: undefined,
        },
      },
    };
    expect(getTimeFilters(state)).toEqual({ to: 'now', from: 'now-15m' });
  });
});

describe('isMapLoading', () => {
  test('should return true when there are layers waiting for map to load', () => {
    const layerList: ILayer[] = [];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [{} as unknown as LayerDescriptor];
    const zoom = 4;
    expect(isMapLoading.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(true);
  });

  test('should return true when there are layers that are loading', () => {
    const layerList = [
      {
        hasErrors: () => {
          return false;
        },
        isLayerLoading: () => {
          return true;
        },
      } as unknown as ILayer,
    ];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(isMapLoading.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(true);
  });

  test('should return false when there are unloaded layers with errors', () => {
    const layerList = [
      {
        hasErrors: () => {
          return true;
        },
        isLayerLoading: () => {
          return true;
        },
      } as unknown as ILayer,
    ];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(isMapLoading.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(false);
  });

  test('should return false when all layers are loaded', () => {
    const layerList = [
      {
        hasErrors: () => {
          return false;
        },
        isLayerLoading: () => {
          return false;
        },
      } as unknown as ILayer,
    ];
    const waitingForMapReadyLayerList: LayerDescriptor[] = [];
    const zoom = 4;
    expect(isMapLoading.resultFunc(layerList, waitingForMapReadyLayerList, zoom)).toBe(false);
  });
});

describe('getQueryableUniqueIndexPatternIds', () => {
  function createLayerMock({
    isVisible = true,
    indexPatterns = [],
  }: {
    isVisible?: boolean;
    indexPatterns?: string[];
  }) {
    return {
      isVisible: () => {
        return isVisible;
      },
      getQueryableIndexPatternIds: () => {
        return indexPatterns;
      },
    } as unknown as ILayer;
  }

  function createWaitLayerDescriptorMock({
    indexPatternId,
    visible = true,
  }: {
    visible?: boolean;
    indexPatternId: string;
  }) {
    return {
      type: LAYER_TYPE.GEOJSON_VECTOR,
      style: {
        type: LAYER_STYLE_TYPE.VECTOR,
      },
      visible,
      sourceDescriptor: ESSearchSource.createDescriptor({
        type: SOURCE_TYPES.ES_SEARCH,
        indexPatternId,
        geoField: 'field',
      }),
    };
  }

  test('should only include visible', () => {
    const layerList: ILayer[] = [
      createLayerMock({}),
      createLayerMock({ indexPatterns: ['foo'] }),
      createLayerMock({ indexPatterns: ['bar'] }),
      createLayerMock({ indexPatterns: ['foobar'], isVisible: false }),
      createLayerMock({ indexPatterns: ['bar'] }),
    ];
    const waitingForMapReadyLayerList: VectorLayerDescriptor[] =
      [] as unknown as VectorLayerDescriptor[];
    expect(
      getQueryableUniqueIndexPatternIds.resultFunc(layerList, waitingForMapReadyLayerList)
    ).toEqual(['foo', 'bar']);
  });

  test('should only include visible and waitlist should take precedence', () => {
    const layerList: ILayer[] = [
      createLayerMock({}),
      createLayerMock({ indexPatterns: ['foo'] }),
      createLayerMock({ indexPatterns: ['bar'] }),
      createLayerMock({ indexPatterns: ['foobar'], isVisible: false }),
      createLayerMock({ indexPatterns: ['bar'] }),
    ];
    const waitingForMapReadyLayerList: VectorLayerDescriptor[] = [
      createWaitLayerDescriptorMock({ indexPatternId: 'foo' }),
      createWaitLayerDescriptorMock({ indexPatternId: 'barfoo', visible: false }),
      createWaitLayerDescriptorMock({ indexPatternId: 'fbr' }),
      createWaitLayerDescriptorMock({ indexPatternId: 'foo' }),
    ] as unknown as VectorLayerDescriptor[];
    expect(
      getQueryableUniqueIndexPatternIds.resultFunc(layerList, waitingForMapReadyLayerList)
    ).toEqual(['foo', 'fbr']);
  });
});

describe('getSpatialFiltersLayer', () => {
  test('should include filters and embeddable search filters', () => {
    const embeddableSearchContext = {
      filters: [
        buildGeoShapeFilter({
          geometry: {
            coordinates: [
              [
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
                [1, 0],
              ],
            ],
            type: 'Polygon',
          },
          geometryLabel: 'myShape',
          geoFieldNames: ['geo.coordinates'],
        }),
      ],
    };
    const geoJsonVectorLayer = getSpatialFiltersLayer.resultFunc(
      [
        buildGeoShapeFilter({
          geometry: {
            coordinates: [
              [
                [-101.21639, 48.1413],
                [-101.21639, 41.84905],
                [-90.95149, 41.84905],
                [-90.95149, 48.1413],
                [-101.21639, 48.1413],
              ],
            ],
            type: 'Polygon',
          },
          geometryLabel: 'myShape',
          geoFieldNames: ['geo.coordinates'],
        }),
      ],
      embeddableSearchContext,
      getDefaultMapSettings()
    );
    expect(geoJsonVectorLayer.isVisible()).toBe(true);
    expect(
      (geoJsonVectorLayer.getSource() as GeoJsonFileSource).getFeatureCollection().features.length
    ).toBe(2);
  });

  test('should not show layer when showSpatialFilters is false', () => {
    const geoJsonVectorLayer = getSpatialFiltersLayer.resultFunc([], undefined, {
      ...getDefaultMapSettings(),
      showSpatialFilters: false,
    });
    expect(geoJsonVectorLayer.isVisible()).toBe(false);
  });
});

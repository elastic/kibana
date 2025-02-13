/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint @typescript-eslint/no-var-requires: 0 */

jest.mock('../selectors/map_selectors', () => ({}));
jest.mock('../reducers/non_serializable_instances', () => ({}));
jest.mock('./data_request_actions', () => {
  return {
    syncDataForAllLayers: () => {},
  };
});
jest.mock('../kibana_services', () => {
  return {
    getMapsCapabilities() {
      return { save: true };
    },
  };
});

import { mapExtentChanged, setMouseCoordinates, setQuery } from './map_actions';

const getStoreMock = jest.fn();
const dispatchMock = jest.fn();
const vectorTileAdapterMock = {
  setTiles: jest.fn(),
};

describe('map_actions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('mapExtentChanged', () => {
    describe('mapState.buffer is undefined', () => {
      beforeEach(() => {
        require('../selectors/map_selectors').getDataFilters = () => {
          return {
            zoom: 5,
          };
        };

        require('../selectors/map_selectors').getLayerList = () => {
          return [];
        };

        require('../reducers/non_serializable_instances').getInspectorAdapters = () => {
          return {
            vectorTiles: vectorTileAdapterMock,
          };
        };
      });

      it('should set buffer', () => {
        const action = mapExtentChanged({
          center: {
            lat: 7.5,
            lon: 97.5,
          },
          extent: {
            maxLat: 10,
            maxLon: 100,
            minLat: 5,
            minLon: 95,
          },
          zoom: 5,
        });
        action(dispatchMock, getStoreMock);

        expect(vectorTileAdapterMock.setTiles.mock.calls[0]).toEqual([[{ x: 24, y: 15, z: 5 }]]);

        expect(dispatchMock.mock.calls[0]).toEqual([
          {
            mapViewContext: {
              center: {
                lat: 7.5,
                lon: 97.5,
              },
              zoom: 5,
              extent: {
                maxLat: 10,
                maxLon: 100,
                minLat: 5,
                minLon: 95,
              },
              buffer: {
                maxLat: 11.1784,
                maxLon: 101.25,
                minLat: 0,
                minLon: 90,
              },
            },
            type: 'MAP_EXTENT_CHANGED',
          },
        ]);
      });
    });

    describe('mapState.buffer is defined', () => {
      const initialZoom = 10;
      beforeEach(() => {
        require('../selectors/map_selectors').getDataFilters = () => {
          return {
            zoom: initialZoom,
            buffer: {
              maxLat: 12.5,
              maxLon: 102.5,
              minLat: 2.5,
              minLon: 92.5,
            },
          };

          require('../reducers/non_serializable_instances').getInspectorAdapters = () => {
            return {
              vectorTiles: vectorTileAdapterMock,
            };
          };
        };
      });

      it('should not update buffer if extent is contained in existing buffer', () => {
        const action = mapExtentChanged({
          center: {
            lat: 8.5,
            lon: 98.5,
          },
          zoom: initialZoom,
          extent: {
            maxLat: 11,
            maxLon: 101,
            minLat: 6,
            minLon: 96,
          },
        });
        action(dispatchMock, getStoreMock);

        expect(vectorTileAdapterMock.setTiles.mock.calls.length).toBe(0);

        expect(dispatchMock.mock.calls[0]).toEqual([
          {
            mapViewContext: {
              center: {
                lat: 8.5,
                lon: 98.5,
              },
              zoom: 10,
              extent: {
                maxLat: 11,
                maxLon: 101,
                minLat: 6,
                minLon: 96,
              },
              buffer: {
                maxLat: 12.5,
                maxLon: 102.5,
                minLat: 2.5,
                minLon: 92.5,
              },
            },
            type: 'MAP_EXTENT_CHANGED',
          },
        ]);
      });

      it('should update buffer if extent is outside of existing buffer', () => {
        const action = mapExtentChanged({
          center: {
            lat: 2.5,
            lon: 87.5,
          },
          zoom: initialZoom,
          extent: {
            maxLat: 5,
            maxLon: 90,
            minLat: 0,
            minLon: 85,
          },
        });
        action(dispatchMock, getStoreMock);

        expect(vectorTileAdapterMock.setTiles.mock.calls.length).toBe(1);

        expect(dispatchMock.mock.calls[0]).toEqual([
          {
            mapViewContext: {
              center: {
                lat: 2.5,
                lon: 87.5,
              },
              zoom: 10,
              extent: {
                maxLat: 5,
                maxLon: 90,
                minLat: 0,
                minLon: 85,
              },
              buffer: {
                maxLat: 5.26601,
                maxLon: 90.35156,
                minLat: -0.35156,
                minLon: 84.72656,
              },
            },
            type: 'MAP_EXTENT_CHANGED',
          },
        ]);
      });

      it('should update buffer when zoom changes', () => {
        const action = mapExtentChanged({
          center: {
            lat: 8.5,
            lon: 98.5,
          },
          zoom: initialZoom + 1,
          extent: {
            maxLat: 11,
            maxLon: 101,
            minLat: 6,
            minLon: 96,
          },
        });
        action(dispatchMock, getStoreMock);

        expect(vectorTileAdapterMock.setTiles.mock.calls.length).toBe(1);

        expect(dispatchMock.mock.calls[0]).toEqual([
          {
            mapViewContext: {
              center: {
                lat: 8.5,
                lon: 98.5,
              },
              zoom: 11,
              extent: {
                maxLat: 11,
                maxLon: 101,
                minLat: 6,
                minLon: 96,
              },
              buffer: {
                maxLat: 11.0059,
                maxLon: 101.07422,
                minLat: 5.96575,
                minLon: 95.97656,
              },
            },
            type: 'MAP_EXTENT_CHANGED',
          },
        ]);
      });
    });
  });

  describe('setMouseCoordinates', () => {
    it('should create SET_MOUSE_COORDINATES action', () => {
      const action = setMouseCoordinates({
        lat: 10,
        lon: 100,
      });

      expect(action).toEqual({
        type: 'SET_MOUSE_COORDINATES',
        lat: 10,
        lon: 100,
      });
    });

    it('should handle longitudes that wrap east to west', () => {
      const action = setMouseCoordinates({
        lat: 10,
        lon: 190,
      });

      expect(action).toEqual({
        type: 'SET_MOUSE_COORDINATES',
        lat: 10,
        lon: -170,
      });
    });

    it('should handle longitudes that wrap west to east', () => {
      const action = setMouseCoordinates({
        lat: 10,
        lon: -190,
      });

      expect(action).toEqual({
        type: 'SET_MOUSE_COORDINATES',
        lat: 10,
        lon: 170,
      });
    });
  });

  describe('setQuery', () => {
    const query = {
      language: 'kuery',
      query: '',
    };
    const timeFilters = { from: 'now-1y', to: 'now' };
    const filters = [
      {
        meta: {
          index: '90943e30-9a47-11e8-b64d-95841ca0b247',
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'extension',
          params: { query: 'png' },
        },
        query: { match_phrase: { extension: 'png' } },
      },
    ];
    const searchSessionId = '1234';

    beforeEach(() => {
      // Mocks the "previous" state
      require('../selectors/map_selectors').getQuery = () => {
        return query;
      };
      require('../selectors/map_selectors').getTimeFilters = () => {
        return timeFilters;
      };
      require('../selectors/map_selectors').getTimeslice = () => {
        return undefined;
      };
      require('../selectors/map_selectors').getFilters = () => {
        return filters;
      };
      require('../selectors/map_selectors').getSearchSessionId = () => {
        return searchSessionId;
      };
      require('../selectors/map_selectors').getSearchSessionMapBuffer = () => {
        return undefined;
      };
      require('../selectors/map_selectors').getMapSettings = () => {
        return {
          autoFitToDataBounds: false,
        };
      };
    });

    it('should dispatch query action and resync when query changes', async () => {
      const newQuery = {
        language: 'kuery',
        query: 'foobar',
      };
      const setQueryAction = await setQuery({
        query: newQuery,
        filters,
        searchSessionId,
      });
      await setQueryAction(dispatchMock, getStoreMock);

      expect(dispatchMock.mock.calls).toEqual([
        [
          {
            searchSessionId,
            timeFilters,
            query: newQuery,
            filters,
            type: 'SET_QUERY',
          },
        ],
        [undefined], // dispatch(syncDataForAllLayers());
      ]);
    });

    it('should dispatch query action when searchSessionId changes', async () => {
      const setQueryAction = await setQuery({
        timeFilters,
        query,
        filters,
        searchSessionId: '5678',
      });
      await setQueryAction(dispatchMock, getStoreMock);

      // dispatchMock calls: dispatch(SET_QUERY) and dispatch(syncDataForAllLayers())
      expect(dispatchMock.mock.calls.length).toEqual(2);
    });

    it('should not dispatch query action when nothing changes', async () => {
      const setQueryAction = await setQuery({
        timeFilters,
        query,
        filters,
        searchSessionId,
      });
      await setQueryAction(dispatchMock, getStoreMock);

      expect(dispatchMock.mock.calls.length).toEqual(0);
    });

    it('should dispatch query action when nothing changes and force refresh', async () => {
      const setQueryAction = await setQuery({
        timeFilters,
        query,
        filters,
        forceRefresh: true,
      });
      await setQueryAction(dispatchMock, getStoreMock);

      expect(dispatchMock.mock.calls.length).toEqual(2);
    });
  });
});

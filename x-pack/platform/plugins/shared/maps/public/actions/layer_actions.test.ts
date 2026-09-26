/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addLayer, removeLayer, replaceLayerList, setLayerVisibility } from './layer_actions';
import type { LayerDescriptor } from '../../common/descriptor_types';
import { LICENSED_FEATURES } from '../licensed_features';
import { createMapStore } from '../reducers/store';
import { mapReady } from './map_actions';
import { LAYER_TYPE, SOURCE_TYPES } from '../../common';
import { SET_LAYER_VISIBILITY, UPDATE_LAYER_PROP } from './map_action_constants';

jest.mock('../kibana_services', () => {
  return {
    getMapsCapabilities() {
      return { save: true };
    },
    getEMSSettings() {
      return {
        isEMSUrlSet() {
          return false;
        },
      };
    },
    getShowMapsInspectorAdapter() {
      return false;
    },
    getTimeFilter: () => ({
      getTime: () => ({ from: 'now-15m', to: 'now' }),
      getRefreshInterval: () => undefined,
    }),
  };
});

const getStoreMock = jest.fn();
const dispatchMock = jest.fn();

// Stubs so existing tests that dispatch thunks through the real Redux store do not
// break when syncDataForLayerId is replaced inside the setLayerVisibility describe block.
const noopThunk = () => async () => {};

describe('layer_actions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('addLayer', () => {
    const notifyLicensedFeatureUsageMock = jest.fn();

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../licensed_features').notifyLicensedFeatureUsage = (feature: LICENSED_FEATURES) => {
        notifyLicensedFeatureUsageMock(feature);
      };

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../reducers/non_serializable_instances').getMapReady = () => {
        return true;
      };

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../selectors/map_selectors').createLayerInstance = () => {
        return {
          getLicensedFeatures() {
            return [LICENSED_FEATURES.GEO_SHAPE_AGGS_GEO_TILE];
          },
        };
      };
    });

    it('should register feature-use', async () => {
      const action = addLayer({} as unknown as LayerDescriptor);
      await action(dispatchMock, getStoreMock);
      expect(notifyLicensedFeatureUsageMock).toHaveBeenCalledWith(
        LICENSED_FEATURES.GEO_SHAPE_AGGS_GEO_TILE
      );
    });
  });

  describe('replaceLayerList', () => {
    let store = createMapStore();

    const ORIGINAL_LAYER_LIST = [
      {
        id: 'layer0',
        sourceDescriptor: {
          id: 'world_countries',
          type: SOURCE_TYPES.EMS_FILE,
        },
        type: LAYER_TYPE.GEOJSON_VECTOR,
      },
      {
        id: 'layer1',
        sourceDescriptor: {
          id: 'australia_states',
          type: SOURCE_TYPES.EMS_FILE,
        },
        type: LAYER_TYPE.GEOJSON_VECTOR,
      },
      {
        id: 'layer2',
        sourceDescriptor: {
          id: 'canada_provinces',
          type: SOURCE_TYPES.EMS_FILE,
        },
        type: LAYER_TYPE.GEOJSON_VECTOR,
      },
      {
        id: 'layer3',
        sourceDescriptor: {
          id: 'usa_states',
          type: SOURCE_TYPES.EMS_FILE,
        },
        type: LAYER_TYPE.GEOJSON_VECTOR,
      },
    ] as LayerDescriptor[];
    const ORIGINAL_LAYER_IDS = ORIGINAL_LAYER_LIST.map(({ id }) => id);

    function getLayerIds() {
      return store.getState().map.layerList.map(({ id }) => id);
    }

    beforeEach(() => {
      store = createMapStore();
      store.dispatch<any>(replaceLayerList(ORIGINAL_LAYER_LIST));
      store.dispatch<any>(mapReady());
    });

    it('should restore deleted layers in correct order', async () => {
      store.dispatch<any>(removeLayer('layer2'));
      expect(getLayerIds()).toEqual(['layer0', 'layer1', 'layer3']);
      store.dispatch<any>(replaceLayerList(ORIGINAL_LAYER_LIST));
      expect(getLayerIds()).toEqual(ORIGINAL_LAYER_IDS);
    });

    it('should remove new layers', async () => {
      store.dispatch<any>(
        addLayer({
          id: 'layer4',
          sourceDescriptor: {
            id: 'uk_subdivisions',
            type: SOURCE_TYPES.EMS_FILE,
          },
          type: LAYER_TYPE.GEOJSON_VECTOR,
        })
      );
      expect(getLayerIds()).toEqual([...ORIGINAL_LAYER_IDS, 'layer4']);
      store.dispatch<any>(replaceLayerList(ORIGINAL_LAYER_LIST));
      expect(getLayerIds()).toEqual(ORIGINAL_LAYER_IDS);
    });

    it('should retain runtime state for existing layers', async () => {
      store.dispatch({
        type: UPDATE_LAYER_PROP,
        id: 'layer0',
        propName: '__dataRequests',
        newValue: [],
      });
      expect('__dataRequests' in store.getState().map.layerList[0]).toBe(true);
      store.dispatch<any>(replaceLayerList(ORIGINAL_LAYER_LIST));
      expect(store.getState().map.layerList[0]).toMatchInlineSnapshot(`
        Object {
          "__dataRequests": Array [],
          "id": "layer0",
          "sourceDescriptor": Object {
            "id": "world_countries",
            "type": "EMS_FILE",
          },
          "type": "GEOJSON_VECTOR",
        }
      `);
    });
  });

  describe('setLayerVisibility', () => {
    const LAYER_ID = 'layer1';
    const syncDataForLayerIdMock = jest.fn(noopThunk);
    let originalGetLayerById: unknown;
    let originalSyncDataForLayerId: unknown;

    beforeEach(() => {
      originalGetLayerById = require('../selectors/map_selectors').getLayerById;
      originalSyncDataForLayerId = require('./data_request_actions').syncDataForLayerId;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./data_request_actions').syncDataForLayerId = syncDataForLayerIdMock;
    });

    afterEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../selectors/map_selectors').getLayerById = originalGetLayerById;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./data_request_actions').syncDataForLayerId = originalSyncDataForLayerId;
      jest.resetAllMocks();
    });

    it('should dispatch SET_LAYER_VISIBILITY and trigger data sync when making a hidden layer visible', () => {
      const hiddenLayer = { getId: () => LAYER_ID, isVisible: () => false };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../selectors/map_selectors').getLayerById = () => hiddenLayer;

      const action = setLayerVisibility(LAYER_ID, true);
      action(dispatchMock, getStoreMock);

      expect(dispatchMock.mock.calls[0]).toEqual([
        { type: SET_LAYER_VISIBILITY, layerId: LAYER_ID, visibility: true },
      ]);
      expect(syncDataForLayerIdMock).toHaveBeenCalledWith(LAYER_ID, false);
      expect(dispatchMock).toHaveBeenCalledTimes(2);
    });

    it('should not dispatch when layer visibility already matches the desired state', () => {
      const visibleLayer = { getId: () => LAYER_ID, isVisible: () => true };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../selectors/map_selectors').getLayerById = () => visibleLayer;

      const action = setLayerVisibility(LAYER_ID, true);
      action(dispatchMock, getStoreMock);

      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });
});

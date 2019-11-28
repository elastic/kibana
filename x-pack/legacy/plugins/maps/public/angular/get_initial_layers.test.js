/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../meta', () => {
  return {};
});

jest.mock('ui/chrome', () => {
  return {};
});

import { getInitialLayers } from './get_initial_layers';

const layerListNotProvided = undefined;

describe('Saved object has layer list', () => {
  it('Should get initial layers from saved object', () => {
    const layerListFromSavedObject = [
      {
        id: 'layerId',
        type: 'mockLayer'
      }
    ];
    const layerListJSON = JSON.stringify(layerListFromSavedObject);
    expect((getInitialLayers(layerListJSON))).toEqual(layerListFromSavedObject);
  });
});

describe('kibana.yml configured with map.tilemap.url', () => {

  beforeAll(() => {
    require('../meta').getKibanaTileMap = () => {
      return {
        url: 'myTileUrl'
      };
    };
  });

  it('Should get initial layer with from Kibana tilemap data source', () => {
    const layers = getInitialLayers(layerListNotProvided);
    expect(layers).toEqual([{
      alpha: 1,
      __dataRequests: [],
      id: layers[0].id,
      label: null,
      maxZoom: 24,
      minZoom: 0,
      sourceDescriptor: {
        type: 'KIBANA_TILEMAP'
      },
      style: {},
      type: 'TILE',
      visible: true,
    }]);
  });
});

describe('EMS is enabled', () => {

  beforeAll(() => {
    require('../meta').getKibanaTileMap = () => {
      return null;
    };
    require('ui/chrome').getInjected = (key) => {
      switch (key) {
        case 'emsTileLayerId':
          return {
            bright: 'road_map',
            desaturated: 'road_map_desaturated',
            dark: 'dark_map',
          };
        case 'isEmsEnabled':
          return true;
        default:
          throw new Error(`Unexpected call to chrome.getInjected with key ${key}`);
      }
    };
  });

  it('Should get initial layer with EMS tile source', () => {
    const layers = getInitialLayers(layerListNotProvided);
    expect(layers).toEqual([{
      alpha: 1,
      __dataRequests: [],
      id: layers[0].id,
      label: null,
      maxZoom: 24,
      minZoom: 0,
      source: undefined,
      sourceDescriptor: {
        isAutoSelect: true,
        type: 'EMS_TMS'
      },
      style: {},
      type: 'VECTOR_TILE',
      visible: true,
    }]);
  });
});

describe('EMS is not enabled', () => {
  beforeAll(() => {
    require('../meta').getKibanaTileMap = () => {
      return null;
    };

    require('ui/chrome').getInjected = (key) => {
      switch (key) {
        case 'isEmsEnabled':
          return false;
        default:
          throw new Error(`Unexpected call to chrome.getInjected with key ${key}`);
      }
    };
  });

  it('Should return empty layer list since there are no configured tile layers', () => {
    expect((getInitialLayers(layerListNotProvided))).toEqual([]);
  });
});

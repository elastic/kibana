/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint @typescript-eslint/no-var-requires: 0 */

jest.mock('../selectors/map_selectors', () => ({}));
jest.mock('../reducers/non_serializable_instances', () => ({}));
jest.mock('../classes/layers/layer_group', () => ({
  isLayerGroup: () => false,
}));

import { syncDataForLayer } from './data_request_actions';
import type { ILayer } from '../classes/layers/layer';

const dispatchMock = jest.fn();

const getState = () =>
  ({
    map: { __pauseSyncData: false },
  } as any);

describe('data_request_actions', () => {
  beforeEach(() => {
    require('../selectors/map_selectors').getDataFilters = () => ({ zoom: 5 });
    require('../selectors/map_selectors').getEditState = () => undefined;
    require('../selectors/map_selectors').getDataRequestDescriptor = () => undefined;
    require('../reducers/non_serializable_instances').getInspectorAdapters = () => ({});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('syncDataForLayer', () => {
    it('should not fetch data when layer is hidden', async () => {
      const syncDataMock = jest.fn();
      const layer = {
        getId: () => 'layer1',
        isVisible: () => false,
        showAtZoomLevel: () => true,
        syncData: syncDataMock,
      } as unknown as ILayer;

      const action = syncDataForLayer(layer, false);
      await action(dispatchMock, getState);

      expect(syncDataMock).not.toHaveBeenCalled();
    });

    it('should fetch data when layer is visible', async () => {
      const syncDataMock = jest.fn();
      const layer = {
        getId: () => 'layer1',
        isVisible: () => true,
        showAtZoomLevel: () => true,
        syncData: syncDataMock,
      } as unknown as ILayer;

      const action = syncDataForLayer(layer, false);
      await action(dispatchMock, getState);

      expect(syncDataMock).toHaveBeenCalledTimes(1);
    });
  });
});

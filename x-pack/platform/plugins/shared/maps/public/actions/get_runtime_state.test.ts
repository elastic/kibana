/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAYER_TYPE } from '../../common';
import type { LayerDescriptor, RuntimeLayerState } from '../../common/descriptor_types';
import { getRuntimeState } from './get_runtime_state';

describe('getRuntimeState', () => {
  test('should only return runtime state', () => {
    const persistentLayerState: LayerDescriptor = {
      id: 'layer1',
      label: 'label for layer 1',
      type: LAYER_TYPE.LAYER_GROUP,
      visible: true,
    };
    const layer: LayerDescriptor & Required<RuntimeLayerState> = {
      ...persistentLayerState,
      __dataRequests: [],
      __isPreviewLayer: false,
      __trackedLayerDescriptor: persistentLayerState,
      __areTilesLoaded: false,
      __tileMetaFeatures: [],
      __tileErrors: [],
    };
    expect(getRuntimeState(layer)).toMatchInlineSnapshot(`
      Object {
        "__areTilesLoaded": false,
        "__dataRequests": Array [],
        "__isPreviewLayer": false,
        "__tileErrors": Array [],
        "__tileMetaFeatures": Array [],
        "__trackedLayerDescriptor": Object {
          "id": "layer1",
          "label": "label for layer 1",
          "type": "LAYER_GROUP",
          "visible": true,
        },
      }
    `);
  });
});

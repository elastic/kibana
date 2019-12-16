/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint max-len: 0 */

import { moveApplyGlobalQueryToSources } from './move_apply_global_query';

describe('moveApplyGlobalQueryToSources', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(moveApplyGlobalQueryToSources({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should ignore layers without ES sources', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'TILE',
        sourceDescriptor: {
          type: 'EMS_TMS',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(moveApplyGlobalQueryToSources({ attributes })).toEqual({
      title: 'my map',
      layerListJSON,
    });
  });

  test('Should move applyGlobalQuery from layer to source', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'HEATMAP',
        applyGlobalQuery: false,
        sourceDescriptor: {
          type: 'ES_GEO_GRID',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(moveApplyGlobalQueryToSources({ attributes })).toEqual({
      title: 'my map',
      layerListJSON:
        '[{"type":"HEATMAP","sourceDescriptor":{"type":"ES_GEO_GRID","applyGlobalQuery":false}}]',
    });
  });

  test('Should move applyGlobalQuery from layer to join', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'VECTOR',
        applyGlobalQuery: false,
        sourceDescriptor: {
          type: 'EMS_FILE',
        },
        joins: [
          {
            right: {},
          },
        ],
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(moveApplyGlobalQueryToSources({ attributes })).toEqual({
      title: 'my map',
      layerListJSON:
        '[{"type":"VECTOR","sourceDescriptor":{"type":"EMS_FILE"},"joins":[{"right":{"applyGlobalQuery":false}}]}]',
    });
  });

  test('Should set applyGlobalQuery to true sources when no value is provided in layer', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'VECTOR',
        sourceDescriptor: {
          type: 'ES_GEO_GRID',
        },
        joins: [
          {
            right: {},
          },
        ],
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(moveApplyGlobalQueryToSources({ attributes })).toEqual({
      title: 'my map',
      layerListJSON:
        '[{"type":"VECTOR","sourceDescriptor":{"type":"ES_GEO_GRID","applyGlobalQuery":true},"joins":[{"right":{"applyGlobalQuery":true}}]}]',
    });
  });
});

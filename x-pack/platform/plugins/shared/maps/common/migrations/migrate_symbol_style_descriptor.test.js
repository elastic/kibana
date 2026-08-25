/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrateSymbolStyleDescriptor } from './migrate_symbol_style_descriptor';
import { LAYER_TYPE, STYLE_TYPE } from '../constants';

describe('migrateSymbolStyleDescriptor', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(migrateSymbolStyleDescriptor({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should ignore non-vector layers', () => {
    const layerListJSON = JSON.stringify([
      {
        type: LAYER_TYPE.HEATMAP,
        style: {
          type: 'HEATMAP',
          colorRampName: 'Greens',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(migrateSymbolStyleDescriptor({ attributes })).toEqual({
      title: 'my map',
      layerListJSON,
    });
  });

  test('Should migrate "symbol" style descriptor', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'VECTOR',
        style: {
          properties: {
            fillColor: {
              type: STYLE_TYPE.STATIC,
              options: { color: '#54B399' },
            },
            symbol: {
              options: {
                symbolizeAs: 'icon',
                symbolId: 'square',
              },
            },
          },
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(migrateSymbolStyleDescriptor({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: JSON.stringify([
        {
          type: 'VECTOR',
          style: {
            properties: {
              fillColor: {
                type: STYLE_TYPE.STATIC,
                options: { color: '#54B399' },
              },
              symbolizeAs: {
                options: { value: 'icon' },
              },
              icon: {
                type: STYLE_TYPE.STATIC,
                options: { value: 'square' },
              },
            },
          },
        },
      ]),
    });
  });

  test('Should migrate style descriptor without "symbol"', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'VECTOR',
        style: {
          properties: {
            fillColor: {
              type: STYLE_TYPE.STATIC,
              options: { color: '#54B399' },
            },
          },
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(migrateSymbolStyleDescriptor({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: JSON.stringify([
        {
          type: 'VECTOR',
          style: {
            properties: {
              fillColor: {
                type: STYLE_TYPE.STATIC,
                options: { color: '#54B399' },
              },
              symbolizeAs: {
                options: { value: 'circle' },
              },
              icon: {
                type: STYLE_TYPE.STATIC,
                options: { value: 'marker' },
              },
            },
          },
        },
      ]),
    });
  });
});

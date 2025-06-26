/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrateOtherCategoryColor } from './migrate_other_category_color';
import { LAYER_STYLE_TYPE, STYLE_TYPE } from '../constants';

describe('migrateOtherCategoryColor', () => {
  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(migrateOtherCategoryColor({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should ignore non-vector styles', () => {
    const layerListJSON = JSON.stringify([
      {
        style: {
          type: LAYER_STYLE_TYPE.HEATMAP,
          colorRampName: 'Greens',
        },
      },
    ]);
    const attributes = {
      title: 'my map',
      layerListJSON,
    };
    expect(migrateOtherCategoryColor({ attributes })).toEqual({
      title: 'my map',
      layerListJSON,
    });
  });

  test('Should migrate other category color', () => {
    const layerListJSON = JSON.stringify([
      {
        style: {
          type: LAYER_STYLE_TYPE.VECTOR,
          properties: {
            fillColor: {
              type: STYLE_TYPE.DYNAMIC,
              options: { customColorPalette: [{ stop: null, color: 'blue' }] },
            },
            lineColor: {
              type: STYLE_TYPE.DYNAMIC,
              options: {
                customColorPalette: [
                  { stop: null, color: 'blue' },
                  { stop: 'value1', color: 'red' },
                ],
              },
            },
            labelColor: {
              type: STYLE_TYPE.DYNAMIC,
              options: {
                customColorPalette: [
                  { stop: null, color: 'blue' },
                  { stop: 'value1', color: 'red' },
                  { stop: 'value2', color: 'green' },
                ],
              },
            },
            labelBorderColor: {
              type: STYLE_TYPE.DYNAMIC,
              options: {
                customColorPalette: [
                  { stop: null, color: 'blue' },
                  { stop: 'value1', color: 'red' },
                  { stop: 'value2', color: 'green' },
                  { stop: 'value3', color: 'yellow' },
                ],
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
    expect(migrateOtherCategoryColor({ attributes })).toEqual({
      title: 'my map',
      layerListJSON: JSON.stringify([
        {
          style: {
            type: LAYER_STYLE_TYPE.VECTOR,
            properties: {
              fillColor: {
                type: STYLE_TYPE.DYNAMIC,
                options: { customColorPalette: [], otherCategoryColor: 'blue' },
              },
              lineColor: {
                type: STYLE_TYPE.DYNAMIC,
                options: {
                  customColorPalette: [{ stop: 'value1', color: 'red' }],
                  otherCategoryColor: 'blue',
                },
              },
              labelColor: {
                type: STYLE_TYPE.DYNAMIC,
                options: {
                  customColorPalette: [
                    { stop: 'value1', color: 'red' },
                    { stop: 'value2', color: 'green' },
                  ],
                  otherCategoryColor: 'blue',
                },
              },
              labelBorderColor: {
                type: STYLE_TYPE.DYNAMIC,
                options: {
                  customColorPalette: [
                    { stop: 'value1', color: 'red' },
                    { stop: 'value2', color: 'green' },
                    { stop: 'value3', color: 'yellow' },
                  ],
                  otherCategoryColor: 'blue',
                },
              },
            },
          },
        },
      ]),
    });
  });
});

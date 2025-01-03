/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { migrateJoinAggKey } from './join_agg_key';

describe('migrateJoinAggKey', () => {
  const joins = [
    {
      leftField: 'machine.os',
      right: {
        id: '9055b4aa-136a-4b6d-90ab-9f94ccfe5eb5',
        indexPatternTitle: 'kibana_sample_data_logs',
        term: 'machine.os.keyword',
        metrics: [
          {
            type: 'avg',
            field: 'bytes',
          },
          {
            type: 'count',
          },
        ],
        whereQuery: {
          query: 'bytes > 10000',
          language: 'kuery',
        },
        indexPatternRefName: 'layer_1_join_0_index_pattern',
      },
    },
    {
      leftField: 'machine.os',
      right: {
        id: '9a7f4e71-9500-4512-82f1-b7eaee3d87ff',
        indexPatternTitle: 'kibana_sample_data_logs',
        term: 'machine.os.keyword',
        whereQuery: {
          query: 'bytes < 10000',
          language: 'kuery',
        },
        metrics: [
          {
            type: 'avg',
            field: 'bytes',
          },
        ],
        indexPatternRefName: 'layer_1_join_1_index_pattern',
      },
    },
  ];

  test('Should handle missing layerListJSON attribute', () => {
    const attributes = {
      title: 'my map',
    };
    expect(migrateJoinAggKey({ attributes })).toEqual({
      title: 'my map',
    });
  });

  test('Should migrate vector styles from legacy join agg key to new join agg key', () => {
    const layerListJSON = JSON.stringify([
      {
        type: 'VECTOR',
        joins,
        style: {
          properties: {
            fillColor: {
              type: 'DYNAMIC',
              options: {
                color: 'Blues',
                colorCategory: 'palette_0',
                field: {
                  name: '__kbnjoin__avg_of_bytes_groupby_kibana_sample_data_logs.machine.os.keyword',
                  origin: 'join',
                },
                fieldMetaOptions: {
                  isEnabled: true,
                  sigma: 3,
                },
                type: 'ORDINAL',
              },
            },
            lineColor: {
              type: 'DYNAMIC',
              options: {
                color: 'Blues',
                colorCategory: 'palette_0',
                field: {
                  name: '__kbnjoin__count_groupby_kibana_sample_data_logs.machine.os.keyword',
                  origin: 'join',
                },
                fieldMetaOptions: {
                  isEnabled: true,
                  sigma: 3,
                },
                type: 'ORDINAL',
              },
            },
            lineWidth: {
              type: 'DYNAMIC',
              options: {
                color: 'Blues',
                colorCategory: 'palette_0',
                field: {
                  name: 'mySourceField',
                  origin: 'source',
                },
                fieldMetaOptions: {
                  isEnabled: true,
                  sigma: 3,
                },
                type: 'ORDINAL',
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
    const { layerListJSON: migratedLayerListJSON } = migrateJoinAggKey({ attributes });
    const migratedLayerList = JSON.parse(migratedLayerListJSON!);
    expect(migratedLayerList[0].style.properties.fillColor.options.field.name).toBe(
      '__kbnjoin__avg_of_bytes__9055b4aa-136a-4b6d-90ab-9f94ccfe5eb5'
    );
    expect(migratedLayerList[0].style.properties.lineColor.options.field.name).toBe(
      '__kbnjoin__count__9055b4aa-136a-4b6d-90ab-9f94ccfe5eb5'
    );
    expect(migratedLayerList[0].style.properties.lineWidth.options.field.name).toBe(
      'mySourceField'
    );
  });
});

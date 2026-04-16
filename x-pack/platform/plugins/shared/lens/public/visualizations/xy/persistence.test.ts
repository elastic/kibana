/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_LAYER_TYPES, SeriesTypes } from '@kbn/lens-common';
import type { XYVisualizationState } from '@kbn/lens-common';
import { convertToPersistable } from './persistence';

describe('xy persistence', () => {
  it('persists auto annotation colors for by-value annotation layers', () => {
    const state = {
      preferredSeriesType: SeriesTypes.LINE,
      legend: {} as XYVisualizationState['legend'],
      layers: [
        {
          layerId: 'annotation-layer',
          layerType: LENS_LAYER_TYPES.ANNOTATIONS,
          indexPatternId: 'data-view',
          ignoreGlobalFilters: true,
          annotations: [
            {
              id: 'annotation-1',
              type: 'manual',
              key: {
                type: 'point_in_time',
                timestamp: '2024-01-01T00:00:00.000Z',
              },
              label: 'Event',
            },
          ],
        },
      ],
    } as XYVisualizationState;

    const persistable = convertToPersistable(state);

    expect(persistable.state.layers[0]).toMatchObject({
      annotations: [
        expect.objectContaining({
          color: 'auto',
        }),
      ],
    });
  });

  it('persists auto annotation colors for linked annotation layer overrides', () => {
    const state = {
      preferredSeriesType: SeriesTypes.LINE,
      legend: {} as XYVisualizationState['legend'],
      layers: [
        {
          layerId: 'annotation-layer',
          layerType: LENS_LAYER_TYPES.ANNOTATIONS,
          annotationGroupId: 'group-1',
          indexPatternId: 'data-view',
          ignoreGlobalFilters: true,
          annotations: [
            {
              id: 'annotation-1',
              type: 'manual',
              key: {
                type: 'point_in_time',
                timestamp: '2024-01-01T00:00:00.000Z',
              },
              label: 'Updated Event',
            },
          ],
          __lastSaved: {
            title: 'Saved group',
            description: '',
            tags: [],
            ignoreGlobalFilters: true,
            indexPatternId: 'data-view',
            annotations: [
              {
                id: 'annotation-1',
                type: 'manual',
                key: {
                  type: 'point_in_time',
                  timestamp: '2024-01-01T00:00:00.000Z',
                },
                label: 'Event',
              },
            ],
          },
        },
      ],
    } as XYVisualizationState;

    const persistable = convertToPersistable(state);

    expect(persistable.state.layers[0]).toMatchObject({
      persistanceType: 'linked',
      annotations: [
        expect.objectContaining({
          color: 'auto',
        }),
      ],
    });
  });
});

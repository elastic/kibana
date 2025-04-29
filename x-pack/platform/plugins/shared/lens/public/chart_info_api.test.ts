/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createChartInfoApi } from './chart_info_api';
import { LensDocument } from './persistence';
import { DatasourceMap, VisualizationMap } from './types';

const mockGetVisualizationInfo = jest.fn().mockReturnValue({
  layers: [
    {
      layerId: 'test',
      dimensions: [
        {
          id: '1',
        },
      ],
    },
  ],
});
const mockGetDatasourceInfo = jest.fn().mockResolvedValue([
  {
    layerId: 'test',
    columns: [
      {
        id: '1',
        role: 'metric',
      },
    ],
  },
]);

describe('createChartInfoApi', () => {
  const dataViews = dataViewPluginMocks.createStartContract();
  test('get correct chart info', async () => {
    const chartInfoApi = await createChartInfoApi(
      dataViews,
      {
        lnsXY: {
          getVisualizationInfo: mockGetVisualizationInfo,
        },
      } as unknown as VisualizationMap,
      {
        from_based: {
          getDatasourceInfo: mockGetDatasourceInfo,
        },
      } as unknown as DatasourceMap
    );
    const vis = {
      title: 'xy',
      visualizationType: 'lnsXY',
      state: {
        datasourceStates: {
          from_based: {},
        },
        visualization: {},
        filters: [],
        query: {
          language: 'lucene',
          query: '',
        },
      },
      filters: [],
      query: {
        language: 'lucene',
        query: '',
      },
      references: [],
    } as LensDocument;

    const chartInfo = await chartInfoApi.getChartInfo(vis);

    expect(mockGetVisualizationInfo).toHaveBeenCalledTimes(1);
    expect(mockGetDatasourceInfo).toHaveBeenCalledTimes(1);
    expect(chartInfo).toEqual({
      filters: [],
      layers: [
        {
          dataView: undefined,
          dimensions: [
            {
              id: '1',
              role: 'metric',
            },
          ],
          layerId: 'test',
        },
      ],
      query: {
        language: 'lucene',
        query: '',
      },
      visualizationType: 'lnsXY',
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { getESQLResults, formatESQLColumns, getESQLAdHocDataview } from '@kbn/esql-utils';
import type { IUiSettingsClient } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { LensPluginStartDependencies } from '../../../plugin';
import { createMockStartDependencies } from '../../../editor_frame_service/mocks';
import {
  mockVisualizationMap,
  mockDatasourceMap,
  mockDataViewWithTimefield,
  mockAllSuggestions,
} from '../../../mocks';
import type {
  TypedLensSerializedState,
  TextBasedPrivateState,
  TextBasedLayer,
  MetricVisualizationState,
} from '@kbn/lens-common';

const getTextBasedLayers = (
  result: TypedLensSerializedState['attributes'] | undefined
): Record<string, TextBasedLayer> => {
  const dsState = result?.state.datasourceStates.textBased as TextBasedPrivateState | undefined;
  return dsState?.layers ?? {};
};
import { suggestionsApi } from '../../../lens_suggestions_api';
import { buildDisplayRowsFromEsqlValues, getGridAttrs, getSuggestions } from './helpers';

const mockSuggestionApi = suggestionsApi as jest.Mock;
const mockFetchData = getESQLResults as jest.Mock;
const mockformatESQLColumns = formatESQLColumns as jest.Mock;
const mockGetESQLAdHocDataview = getESQLAdHocDataview as jest.Mock;

jest.mock('../../../lens_suggestions_api', () => ({
  suggestionsApi: jest.fn(() => mockAllSuggestions),
}));

const queryResponseColumns = [
  {
    name: '@timestamp',
    id: '@timestamp',
    meta: {
      type: 'date',
    },
  },
  {
    name: 'bytes',
    id: 'bytes',
    meta: {
      type: 'number',
    },
  },
  {
    name: 'memory',
    id: 'memory',
    meta: {
      type: 'number',
    },
  },
];

jest.mock('@kbn/esql-utils', () => {
  return {
    getESQLResults: jest.fn().mockResolvedValue({
      response: {
        columns: queryResponseColumns,
        values: [],
      },
    }),
    getIndexPatternFromESQLQuery: jest.fn().mockReturnValue('index1'),
    getESQLAdHocDataview: jest.fn().mockResolvedValue({}),
    formatESQLColumns: jest.fn().mockReturnValue(queryResponseColumns),
  };
});

describe('Lens inline editing helpers', () => {
  describe('buildDisplayRowsFromEsqlValues', () => {
    it('returns values unchanged when value and display columns match in order', () => {
      const valueColumns = [
        { name: 'a', type: 'double' },
        { name: 'b', type: 'integer' },
      ];
      const values = [
        [1, 2],
        [3, 4],
      ];

      expect(
        buildDisplayRowsFromEsqlValues({
          displayColumns: valueColumns,
          valueColumns,
          values,
        })
      ).toEqual(values);
    });

    it('maps row cells by column name when all_columns is a superset of columns', () => {
      const displayColumns = [
        { name: 'count', type: 'double' },
        { name: 'max_value', type: 'integer' },
      ];
      const valueColumns = [{ name: 'max_value', type: 'integer' }];
      const values = [[500]];

      expect(
        buildDisplayRowsFromEsqlValues({
          displayColumns,
          valueColumns,
          values,
        })
      ).toEqual([[null, 500]]);
    });
  });

  describe('getSuggestions', () => {
    const query = {
      esql: 'from index1 | limit 10 | stats average = avg(bytes)',
    };
    const mockStartDependencies =
      createMockStartDependencies() as unknown as LensPluginStartDependencies;
    const dataViews = dataViewPluginMocks.createStartContract();
    const httpMock = coreMock.createStart().http;
    dataViews.create.mockResolvedValue(mockDataViewWithTimefield);
    mockStartDependencies.data.dataViews = dataViews;
    const uiSettingsMock = {
      get: jest.fn(),
    } as unknown as IUiSettingsClient;

    const dataviewSpecArr = [
      {
        id: 'd2588ae7-9ea0-4439-9f5b-f808754a3b97',
        title: 'index1',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        allowNoIndex: false,
        name: 'index1',
      },
    ];
    const startDependencies = {
      ...mockStartDependencies,
      dataViews,
    };

    it('returns the suggestions attributes correctly', async () => {
      const suggestionsAttributes = await getSuggestions(
        query,
        startDependencies.data,
        httpMock,
        uiSettingsMock,
        mockDatasourceMap(),
        mockVisualizationMap(),
        dataviewSpecArr,
        jest.fn()
      );
      expect(suggestionsAttributes?.visualizationType).toBe(mockAllSuggestions[0].visualizationId);
      expect(suggestionsAttributes?.state.visualization).toStrictEqual(
        mockAllSuggestions[0].visualizationState
      );
    });

    it('does not populate the title from the suggestion', async () => {
      const suggestionsAttributes = await getSuggestions(
        query,
        startDependencies.data,
        httpMock,
        uiSettingsMock,
        mockDatasourceMap(),
        mockVisualizationMap(),
        dataviewSpecArr,
        jest.fn()
      );
      expect(mockAllSuggestions[0].title).not.toBe('');
      expect(suggestionsAttributes?.title).toBe('');
    });

    it('returns undefined if no suggestions are computed', async () => {
      mockSuggestionApi.mockResolvedValueOnce([]);
      const suggestionsAttributes = await getSuggestions(
        query,
        startDependencies.data,
        httpMock,
        uiSettingsMock,
        mockDatasourceMap(),
        mockVisualizationMap(),
        dataviewSpecArr,
        jest.fn()
      );
      expect(suggestionsAttributes).toBeUndefined();
    });

    it('returns an error if fetching the data fails', async () => {
      mockFetchData.mockImplementation(() => {
        throw new Error('sorry!');
      });
      const setErrorsSpy = jest.fn();
      const suggestionsAttributes = await getSuggestions(
        query,
        startDependencies.data,
        httpMock,
        uiSettingsMock,
        mockDatasourceMap(),
        mockVisualizationMap(),
        dataviewSpecArr,
        setErrorsSpy
      );
      expect(suggestionsAttributes).toBeUndefined();
      expect(setErrorsSpy).toHaveBeenCalled();
    });

    it('does not call setErrors when the request is aborted', async () => {
      mockFetchData.mockImplementation(() => {
        throw new Error('aborted');
      });
      const setErrorsSpy = jest.fn();
      const abortController = new AbortController();
      abortController.abort();
      const suggestionsAttributes = await getSuggestions(
        query,
        startDependencies.data,
        httpMock,
        uiSettingsMock,
        mockDatasourceMap(),
        mockVisualizationMap(),
        dataviewSpecArr,
        setErrorsSpy,
        abortController
      );
      expect(suggestionsAttributes).toBeUndefined();
      expect(setErrorsSpy).not.toHaveBeenCalled();
    });

    describe('trendline layer preservation', () => {
      const mainLayerId = '46aa21fa-b747-4543-bf90-0b40007c546d';
      const trendlineLayerId = 'trendline-layer-1';

      const prevAttributes: TypedLensSerializedState['attributes'] = {
        title: '',
        references: [],
        visualizationType: 'lnsMetric',
        state: {
          visualization: {
            layerId: mainLayerId,
            metricAccessor: '81e332d6-ee37-42a8-a646-cea4fc75d2d3',
            trendlineLayerId,
            trendlineMetricAccessor: 'trend-metric-1',
            trendlineTimeAccessor: 'trend-time-1',
          },
          datasourceStates: {
            textBased: {
              layers: {
                [mainLayerId]: {
                  index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                  query: { esql: 'FROM index1 | STATS COUNT(*)' },
                  columns: [
                    {
                      columnId: '81e332d6-ee37-42a8-a646-cea4fc75d2d3',
                      fieldName: 'COUNT(*)',
                      meta: { type: 'number' },
                    },
                  ],
                  timeField: '@timestamp',
                },
                [trendlineLayerId]: {
                  index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                  query: {
                    esql: 'FROM index1 | STATS COUNT(*) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                  },
                  columns: [
                    {
                      columnId: 'trend-metric-1',
                      fieldName: 'COUNT(*)',
                      meta: { type: 'number' },
                    },
                    {
                      columnId: 'trend-time-1',
                      fieldName: 'BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
                      meta: { type: 'date' },
                    },
                  ],
                  timeField: '@timestamp',
                },
              },
            },
          },
          filters: [],
          query: { esql: 'FROM index1 | STATS COUNT(*)' },
        },
      };

      beforeEach(() => {
        mockFetchData.mockResolvedValue({
          response: { columns: queryResponseColumns, values: [] },
        });
      });

      it('preserves the trendline layer and updates its query when the main query changes', async () => {
        const newQuery = { esql: 'FROM index1 | STATS AVG(bytes)' };
        const result = await getSuggestions(
          newQuery,
          startDependencies.data,
          httpMock,
          uiSettingsMock,
          mockDatasourceMap(),
          mockVisualizationMap(),
          dataviewSpecArr,
          jest.fn(),
          undefined,
          undefined,
          [],
          true,
          prevAttributes
        );

        const layers = getTextBasedLayers(result);
        expect(layers[trendlineLayerId]).toBeDefined();
        const trendlineEsql = layers[trendlineLayerId].query?.esql;
        expect(trendlineEsql).toContain('AVG(bytes)');
        expect(trendlineEsql).toContain('BUCKET');
        expect(trendlineEsql).not.toContain('COUNT(*)');
      });

      it('preserves trendline metric binding when the edited query has no STATS', async () => {
        const metricAccessor = 'metric-accessor';
        const trendlineMetricAccessor = 'trend-metric-1';
        const newQuery = { esql: 'FROM index1 | KEEP bytes' };

        mockSuggestionApi.mockReturnValueOnce([
          {
            title: 'Metric',
            score: 1,
            visualizationId: 'lnsMetric',
            previewIcon: 'metric',
            visualizationState: {
              layerId: mainLayerId,
              layerType: 'data',
              metricAccessor,
              trendlineLayerId,
              trendlineMetricAccessor,
              trendlineTimeAccessor: 'trend-time-1',
            },
            keptLayerIds: [mainLayerId],
            datasourceState: {
              layers: {
                [mainLayerId]: {
                  index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                  query: newQuery,
                  columns: [
                    {
                      columnId: metricAccessor,
                      fieldName: 'bytes',
                      meta: { type: 'number' },
                    },
                  ],
                  timeField: '@timestamp',
                },
              },
              fieldList: [],
              indexPatternRefs: [],
              initialContext: {},
            },
            datasourceId: 'textBased',
            columns: 1,
            changeType: 'initial',
          },
        ]);

        const result = await getSuggestions(
          newQuery,
          startDependencies.data,
          httpMock,
          uiSettingsMock,
          mockDatasourceMap(),
          mockVisualizationMap(),
          dataviewSpecArr,
          jest.fn(),
          undefined,
          undefined,
          [],
          true,
          prevAttributes
        );

        const trendlineLayer = getTextBasedLayers(result)[trendlineLayerId];

        expect(trendlineLayer.query?.esql).toContain('AVG(bytes)');
        expect(trendlineLayer.query?.esql).not.toContain('COUNT(*)');
        expect(
          trendlineLayer.columns.find((column) => column.columnId === trendlineMetricAccessor)
            ?.fieldName
        ).toBe('AVG(bytes)');
      });

      it('removes stale trendline breakdown when the edited query switches to a single metric', async () => {
        const metricAccessor = 'metric-accessor';
        const trendlineMetricAccessor = 'trend-metric-1';
        const trendlineBreakdownAccessor = 'trend-breakdown-1';
        const newQuery = { esql: 'FROM index1 | KEEP bytes' };
        const prevTextBasedState = prevAttributes.state.datasourceStates.textBased;
        if (!prevTextBasedState) {
          throw new Error('Expected textBased datasource state');
        }
        const prevMainLayer = prevTextBasedState.layers[mainLayerId];
        const prevTrendlineLayer = prevTextBasedState.layers[trendlineLayerId];
        if (!prevMainLayer || !prevTrendlineLayer) {
          throw new Error('Expected previous main and trendline layers');
        }

        const prevVisualization = prevAttributes.state
          .visualization as Partial<MetricVisualizationState>;
        const prevAttributesWithBreakdown: TypedLensSerializedState['attributes'] = {
          ...prevAttributes,
          state: {
            ...prevAttributes.state,
            visualization: {
              ...prevVisualization,
              breakdownByAccessor: 'breakdown-accessor',
              trendlineBreakdownByAccessor: trendlineBreakdownAccessor,
            },
            datasourceStates: {
              textBased: {
                layers: {
                  ...prevTextBasedState.layers,
                  [mainLayerId]: {
                    ...prevMainLayer,
                    columns: [
                      ...prevMainLayer.columns,
                      {
                        columnId: 'breakdown-accessor',
                        fieldName: '@timestamp',
                        meta: { type: 'date' },
                      },
                    ],
                  },
                  [trendlineLayerId]: {
                    ...prevTrendlineLayer,
                    columns: [
                      ...prevTrendlineLayer.columns,
                      {
                        columnId: trendlineBreakdownAccessor,
                        fieldName: '@timestamp',
                        meta: { type: 'date' },
                      },
                    ],
                  },
                },
              },
            },
          },
        };

        mockSuggestionApi.mockReturnValueOnce([
          {
            title: 'Metric',
            score: 1,
            visualizationId: 'lnsMetric',
            previewIcon: 'metric',
            visualizationState: {
              layerId: mainLayerId,
              layerType: 'data',
              metricAccessor,
              trendlineLayerId,
              trendlineMetricAccessor,
              trendlineTimeAccessor: 'trend-time-1',
            },
            keptLayerIds: [mainLayerId],
            datasourceState: {
              layers: {
                [mainLayerId]: {
                  index: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
                  query: newQuery,
                  columns: [
                    {
                      columnId: metricAccessor,
                      fieldName: 'bytes',
                      meta: { type: 'number' },
                    },
                  ],
                  timeField: '@timestamp',
                },
              },
              fieldList: [],
              indexPatternRefs: [],
              initialContext: {},
            },
            datasourceId: 'textBased',
            columns: 1,
            changeType: 'initial',
          },
        ]);

        const result = await getSuggestions(
          newQuery,
          startDependencies.data,
          httpMock,
          uiSettingsMock,
          mockDatasourceMap(),
          mockVisualizationMap(),
          dataviewSpecArr,
          jest.fn(),
          undefined,
          undefined,
          [],
          true,
          prevAttributesWithBreakdown
        );

        const trendlineLayer = getTextBasedLayers(result)[trendlineLayerId];
        const visualization = result?.state.visualization as Partial<MetricVisualizationState>;

        expect(trendlineLayer.query?.esql).toBe(
          'FROM index1 | KEEP bytes | STATS AVG(bytes) BY BUCKET(@timestamp, 75, ?_tstart, ?_tend)'
        );
        expect(
          trendlineLayer.columns.some((column) => column.columnId === trendlineBreakdownAccessor)
        ).toBe(false);
        expect(visualization.trendlineBreakdownByAccessor).toBeUndefined();
      });

      it('does not add a trendline layer when none existed', async () => {
        const attrsWithoutTrendline: TypedLensSerializedState['attributes'] = {
          ...prevAttributes,
          state: {
            ...prevAttributes.state,
            visualization: {
              layerId: mainLayerId,
              metricAccessor: '81e332d6-ee37-42a8-a646-cea4fc75d2d3',
            },
          },
        };

        const result = await getSuggestions(
          query,
          startDependencies.data,
          httpMock,
          uiSettingsMock,
          mockDatasourceMap(),
          mockVisualizationMap(),
          dataviewSpecArr,
          jest.fn(),
          undefined,
          undefined,
          [],
          true,
          attrsWithoutTrendline
        );

        const layers = getTextBasedLayers(result);
        expect(layers[trendlineLayerId]).toBeUndefined();
      });
    });
  });

  describe('getGridAttrs', () => {
    const query = {
      esql: 'from index1 | limit 10 | stats average = avg(bytes)',
    };
    const mockStartDependencies =
      createMockStartDependencies() as unknown as LensPluginStartDependencies;
    const dataViews = dataViewPluginMocks.createStartContract();
    dataViews.create.mockResolvedValue(mockDataViewWithTimefield);
    mockStartDependencies.data.dataViews = dataViews;
    const dataviewSpecArr = [
      {
        id: 'd2588ae7-9ea0-4439-9f5b-f808754a3b97',
        title: 'index1',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        fieldFormats: {},
        runtimeFieldMap: {},
        fieldAttrs: {},
        allowNoIndex: false,
        name: 'index1',
      },
    ];
    const startDependencies = {
      ...mockStartDependencies,
      dataViews,
      http: coreMock.createStart().http,
    };

    const uiSettingsMock = {
      get: jest.fn(),
    } as unknown as IUiSettingsClient;

    it('returns the columns if the array is not empty in the response', async () => {
      mockFetchData.mockImplementation(() => {
        return {
          response: {
            columns: queryResponseColumns,
            values: [],
          },
        };
      });
      const gridAttributes = await getGridAttrs(
        query,
        dataviewSpecArr,
        startDependencies.data,
        startDependencies.http,
        uiSettingsMock
      );
      expect(gridAttributes.columns).toStrictEqual(queryResponseColumns);
    });

    it('returns all_columns if the columns array is empty in the response and all_columns exist', async () => {
      const emptyColumns = [
        {
          name: 'bytes',
          id: 'bytes',
          meta: {
            type: 'number',
          },
        },
      ];
      mockFetchData.mockImplementation(() => {
        return {
          response: {
            columns: [],
            values: [],
            all_columns: emptyColumns,
          },
        };
      });
      mockformatESQLColumns.mockImplementation(() => emptyColumns);
      const gridAttributes = await getGridAttrs(
        query,
        dataviewSpecArr,
        startDependencies.data,
        startDependencies.http,
        uiSettingsMock
      );
      expect(gridAttributes.columns).toStrictEqual(emptyColumns);
    });

    it('passes all_columns to formatESQLColumns and expands values by name when columns is a subset', async () => {
      const allColumnsRaw = [
        { name: 'count', type: 'double' },
        { name: 'max_value', type: 'integer' },
      ];
      const subsetColumns = [{ name: 'max_value', type: 'integer' }];
      const formattedColumns = [
        { name: 'count', id: 'count', meta: { type: 'number', esType: 'double' } },
        { name: 'max_value', id: 'max_value', meta: { type: 'number', esType: 'integer' } },
      ];

      mockFetchData.mockImplementation(() => ({
        response: {
          all_columns: allColumnsRaw,
          columns: subsetColumns,
          values: [[500]],
        },
      }));
      mockformatESQLColumns.mockReturnValueOnce(formattedColumns);

      const gridAttributes = await getGridAttrs(
        query,
        dataviewSpecArr,
        startDependencies.data,
        startDependencies.http,
        uiSettingsMock
      );

      expect(mockformatESQLColumns).toHaveBeenCalledWith(allColumnsRaw);
      expect(gridAttributes.rows).toEqual([[null, 500]]);
      expect(gridAttributes.columns).toStrictEqual(formattedColumns);
    });

    it('falls back to getESQLAdHocDataview when spec has no timeFieldName', async () => {
      dataViews.create.mockClear();
      mockFetchData.mockImplementation(() => ({
        response: { columns: queryResponseColumns, values: [] },
      }));
      mockGetESQLAdHocDataview.mockResolvedValue({
        timeFieldName: '@timestamp',
      });

      const specWithoutTimeField = [
        {
          id: 'spec-id-123',
          title: 'index1',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: 'index1',
        },
      ];

      await getGridAttrs(
        query,
        specWithoutTimeField,
        startDependencies.data,
        startDependencies.http,
        uiSettingsMock
      );

      expect(mockGetESQLAdHocDataview).toHaveBeenCalledWith(
        expect.objectContaining({
          query: query.esql,
          options: { skipFetchFields: true, id: 'spec-id-123' },
        })
      );
      expect(dataViews.create).not.toHaveBeenCalled();
    });

    it('falls back to getESQLAdHocDataview with id undefined when no spec matches', async () => {
      mockFetchData.mockImplementation(() => ({
        response: { columns: queryResponseColumns, values: [] },
      }));
      mockGetESQLAdHocDataview.mockResolvedValue({
        timeFieldName: '@timestamp',
      });

      await getGridAttrs(query, [], startDependencies.data, startDependencies.http, uiSettingsMock);

      expect(mockGetESQLAdHocDataview).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { skipFetchFields: true, id: undefined },
        })
      );
    });

    it('uses dataViews.create when spec has timeFieldName', async () => {
      mockFetchData.mockImplementation(() => ({
        response: { columns: queryResponseColumns, values: [] },
      }));
      mockGetESQLAdHocDataview.mockClear();

      await getGridAttrs(
        query,
        dataviewSpecArr,
        startDependencies.data,
        startDependencies.http,
        uiSettingsMock
      );

      expect(dataViews.create).toHaveBeenCalledWith(
        expect.objectContaining({ timeFieldName: '@timestamp' })
      );
      expect(mockGetESQLAdHocDataview).not.toHaveBeenCalled();
    });
  });
});

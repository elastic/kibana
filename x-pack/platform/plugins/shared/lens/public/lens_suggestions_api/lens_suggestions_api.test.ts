/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { ChartType } from '@kbn/visualization-utils';
import type { DatasourceMock } from '../mocks';
import { createMockVisualization, createMockDatasource } from '../mocks';
import type { DatasourceSuggestion, TypedLensByValueInput } from '@kbn/lens-common';
import { suggestionsApi } from '.';

const generateSuggestion = (state = {}, layerId: string = 'first'): DatasourceSuggestion => ({
  state,
  table: {
    columns: [],
    isMultiRow: false,
    layerId,
    changeType: 'unchanged',
  },
  keptLayerIds: [layerId],
});

const textBasedQueryColumns = [
  {
    id: 'field1',
    name: 'field1',
    meta: {
      type: 'number',
    },
  },
  {
    id: 'field2',
    name: 'field2',
    meta: {
      type: 'string',
    },
  },
] as DatatableColumn[];

describe('suggestionsApi', () => {
  let datasourceMap: Record<string, DatasourceMock>;
  const mockVis = createMockVisualization();
  beforeEach(() => {
    datasourceMap = {
      textBased: createMockDatasource('textBased'),
    };
  });
  test('call the getDatasourceSuggestionsForVisualizeField for the text based query', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      testVis: {
        ...mockVis,
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        esql: 'FROM "index1" | keep field1, field2',
      },
    };
    const suggestions = suggestionsApi({ context, dataView, datasourceMap, visualizationMap });
    expect(datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField).toHaveBeenCalledWith(
      { layers: {}, indexPatternRefs: [], initialContext: context },
      'index1',
      '',
      { index1: { id: 'index1' } }
    );
    expect(datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState).not.toHaveBeenCalled();
    expect(suggestions?.length).toEqual(0);
  });

  test('returns the visualizations suggestions', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      testVis: {
        ...mockVis,
        getSuggestions: () => [
          {
            score: 0.2,
            title: 'Test',
            state: {},
            previewIcon: 'empty',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        esql: 'FROM "index1" | keep field1, field2',
      },
    };
    const suggestions = suggestionsApi({ context, dataView, datasourceMap, visualizationMap });
    expect(datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState).toHaveBeenCalled();
    expect(suggestions?.length).toEqual(1);
  });

  test('filters out legacy metric and incomplete suggestions', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      testVis: {
        ...mockVis,
        getSuggestions: () => [
          {
            score: 0.2,
            title: 'Test',
            state: {},
            previewIcon: 'empty',
            visualizationId: 'lnsLegacyMetric',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
            incomplete: true,
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        esql: 'FROM "index1" | keep field1, field2',
      },
    };
    const suggestions = suggestionsApi({ context, dataView, datasourceMap, visualizationMap });
    expect(datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState).toHaveBeenCalled();
    expect(suggestions?.length).toEqual(1);
  });

  test('keeps a datatable suggestion although it is marked as hidden', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      testVis: {
        ...mockVis,
        getSuggestions: () => [
          {
            score: 0.8,
            title: 'Lens datatable',
            state: {},
            previewIcon: 'empty',
            visualizationId: 'lnsDatatable',
            hide: true,
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
            incomplete: true,
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        esql: 'FROM "index1" | keep field1, field2',
      },
    };
    const suggestions = suggestionsApi({
      context,
      dataView,
      datasourceMap,
      visualizationMap,
      preferredChartType: ChartType.Tagcloud,
    });
    expect(suggestions?.length).toEqual(1);
    expect(suggestions?.[0].title).toEqual('Lens datatable');
  });

  test('prioritizes the chart type of the user preference if any', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      testVis: {
        ...mockVis,
        getSuggestions: () => [
          {
            score: 0.8,
            title: 'Tag cloud',
            state: {},
            previewIcon: 'empty',
            visualizationId: 'lnsTagcloud',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
            incomplete: true,
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        esql: 'FROM "index1" | keep field1, field2',
      },
    };
    const suggestions = suggestionsApi({
      context,
      dataView,
      datasourceMap,
      visualizationMap,
      preferredChartType: ChartType.Tagcloud,
    });
    expect(suggestions?.length).toEqual(1);
    expect(suggestions?.[0].title).toEqual('Tag cloud');
  });

  test('returns the suggestion as line if user asks for it ', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      lnsXY: {
        ...mockVis,
        switchVisualizationType(seriesType: string, state: unknown) {
          return {
            ...(state as Record<string, unknown>),
            preferredSeriesType: seriesType,
          };
        },
        getSuggestions: () => [
          {
            score: 0.8,
            title: 'bar',
            state: {
              preferredSeriesType: 'bar_stacked',
            },
            previewIcon: 'empty',
            visualizationId: 'lnsXY',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
            incomplete: true,
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        esql: 'FROM "index1" | keep field1, field2',
      },
    };
    const suggestions = suggestionsApi({
      context,
      dataView,
      datasourceMap,
      visualizationMap,
      preferredChartType: ChartType.Line,
    });
    expect(suggestions?.length).toEqual(1);
    expect(suggestions?.[0]).toMatchInlineSnapshot(`
      Object {
        "changeType": "unchanged",
        "columns": 0,
        "datasourceId": "textBased",
        "datasourceState": Object {},
        "keptLayerIds": Array [
          "first",
        ],
        "previewIcon": "empty",
        "score": 0.8,
        "title": "bar",
        "visualizationId": "lnsXY",
        "visualizationState": Object {
          "preferredSeriesType": "line",
        },
      }
    `);
  });

  test('returns the suggestion as donut if user asks for it ', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      lnsPie: {
        ...mockVis,
        switchVisualizationType(seriesType: string, state: unknown) {
          return {
            ...(state as Record<string, unknown>),
            preferredSeriesType: seriesType,
          };
        },
        getSuggestions: () => [
          {
            score: 0.8,
            title: 'pie',
            state: {
              preferredSeriesType: 'pie',
            },
            previewIcon: 'empty',
            visualizationId: 'lnsPie',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
            incomplete: true,
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        esql: 'FROM "index1" | keep field1, field2',
      },
    };
    const suggestions = suggestionsApi({
      context,
      dataView,
      datasourceMap,
      visualizationMap,
      preferredChartType: ChartType.Donut,
    });
    expect(suggestions?.length).toEqual(1);

    expect(suggestions?.[0]).toMatchInlineSnapshot(`
      Object {
        "changeType": "unchanged",
        "columns": 0,
        "datasourceId": "textBased",
        "datasourceState": Object {},
        "keptLayerIds": Array [
          "first",
        ],
        "previewIcon": "empty",
        "score": 0.8,
        "title": "pie",
        "visualizationId": "lnsPie",
        "visualizationState": Object {
          "preferredSeriesType": "donut",
        },
      }
    `);
  });

  test('returns the suggestion with the preferred attributes ', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      lnsXY: {
        ...mockVis,
        switchVisualizationType(seriesType: string, state: unknown) {
          return {
            ...(state as Record<string, unknown>),
            preferredSeriesType: seriesType,
          };
        },
        getSuggestions: () => [
          {
            score: 0.8,
            title: 'bar',
            state: {
              preferredSeriesType: 'bar_stacked',
              legend: {
                isVisible: true,
                position: 'right',
              },
            },
            previewIcon: 'empty',
            visualizationId: 'lnsXY',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
            incomplete: true,
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        esql: 'FROM "index1" | keep field1, field2',
      },
    };
    const suggestions = suggestionsApi({
      context,
      dataView,
      datasourceMap,
      visualizationMap,
      preferredVisAttributes: {
        visualizationType: 'lnsXY',
        state: {
          visualization: {
            preferredSeriesType: 'bar_stacked',
            legend: {
              isVisible: false,
              position: 'left',
            },
          },
          datasourceStates: { textBased: { layers: {} } },
          query: {
            esql: 'FROM "index1" | keep field1',
          },
        },
      } as unknown as TypedLensByValueInput['attributes'],
    });
    expect(suggestions?.length).toEqual(1);
    expect(suggestions?.[0]).toMatchInlineSnapshot(`
      Object {
        "changeType": "unchanged",
        "columns": 0,
        "datasourceId": "textBased",
        "datasourceState": Object {
          "layers": Object {},
        },
        "keptLayerIds": Array [],
        "previewIcon": "empty",
        "score": 0.8,
        "title": undefined,
        "visualizationId": "lnsXY",
        "visualizationState": Object {
          "legend": Object {
            "isVisible": false,
            "position": "left",
          },
          "preferredSeriesType": "bar_stacked",
        },
      }
    `);
  });

  test('filters out the suggestion if exists on excludedVisualizations', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const visualizationMap = {
      testVis: {
        ...mockVis,
        getSuggestions: () => [
          {
            score: 0.2,
            title: 'Test',
            state: {},
            previewIcon: 'empty',
            visualizationId: 'lnsXY',
          },
          {
            score: 0.8,
            title: 'Test2',
            state: {},
            previewIcon: 'empty',
          },
        ],
      },
    };
    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);
    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        esql: 'FROM "index1" | keep field1, field2',
      },
    };
    const suggestions = suggestionsApi({
      context,
      dataView,
      datasourceMap,
      visualizationMap,
      excludedVisualizations: ['lnsXY'],
    });
    expect(datasourceMap.textBased.getDatasourceSuggestionsFromCurrentState).toHaveBeenCalled();
    expect(suggestions?.length).toEqual(1);
  });

  test('calls isSubtypeSupported and passes chartType as subVisualizationId when supported', async () => {
    const dataView = { id: 'index1' } as unknown as DataView;
    const isSubtypeSupportedMock = jest.fn().mockReturnValue(true);

    const visualizationMap = {
      testVis: {
        ...mockVis,
        isSubtypeSupported: isSubtypeSupportedMock,
      },
    };

    datasourceMap.textBased.getDatasourceSuggestionsForVisualizeField.mockReturnValue([
      generateSuggestion(),
    ]);

    const context = {
      dataViewSpec: {
        id: 'index1',
        title: 'index1',
        name: 'DataView',
      },
      fieldName: '',
      textBasedColumns: textBasedQueryColumns,
      query: {
        esql: 'FROM "index1" | keep field1, field2',
      },
    };

    suggestionsApi({
      context,
      dataView,
      datasourceMap,
      visualizationMap,
      preferredChartType: ChartType.Line,
    });

    expect(isSubtypeSupportedMock).toHaveBeenCalledWith('line');
  });
});

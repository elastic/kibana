/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSuggestions } from './xy_suggestions';
import type {
  TableSuggestionColumn,
  VisualizationSuggestion,
  TableSuggestion,
} from '@kbn/lens-common';
import type { XYState, XYAnnotationLayerConfig, XYDataLayerConfig } from './types';
import { visualizationSubtypes } from './types';
import { generateId } from '../../id_generator';
import { type PaletteOutput, DEFAULT_COLOR_MAPPING_CONFIG } from '@kbn/coloring';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { getVisualizationSubtypeId } from './visualization_helpers';

jest.mock('../../id_generator');

describe('xy_suggestions', () => {
  function numCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        label: `Avg ${columnId}`,
        isBucketed: false,
        scale: 'ratio',
      },
    };
  }

  function staticValueCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        label: `Static value: ${columnId}`,
        isBucketed: false,
        isStaticValue: true,
      },
    };
  }

  function strCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'string',
        label: `Top 5 ${columnId}`,
        isBucketed: true,
        scale: 'ordinal',
      },
    };
  }

  function dateCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'date',
        isBucketed: true,
        label: `${columnId} histogram`,
        scale: 'interval',
      },
    };
  }

  function histogramCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        isBucketed: true,
        label: `${columnId} histogram`,
        scale: 'interval',
      },
    };
  }

  function ipCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'ip',
        label: `Top ${columnId}`,
        isBucketed: true,
        scale: 'ordinal',
      },
    };
  }

  function geoPointCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'geo_point',
        label: `Top ${columnId}`,
        isBucketed: true,
        scale: 'ordinal',
      },
    };
  }

  function gaugeCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'gauge',
        label: `${columnId} gauge`,
        isBucketed: true,
        scale: 'ordinal',
      },
    };
  }

  // Helper that plucks out the important part of a suggestion for
  // most test assertions
  function suggestionSubset(suggestion: VisualizationSuggestion<XYState>) {
    return (suggestion.state.layers as XYDataLayerConfig[]).map(
      ({ seriesType, splitAccessors, xAccessor, accessors }) => ({
        seriesType,
        splitAccessors,
        x: xAccessor,
        y: accessors,
      })
    );
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('partially maps invalid combinations, but hides them', () => {
    expect(
      (
        [
          {
            isMultiRow: true,
            columns: [dateCol('a')],
            layerId: 'first',
            changeType: 'unchanged',
          },
          {
            isMultiRow: true,
            columns: [strCol('foo'), strCol('bar')],
            layerId: 'first',
            changeType: 'unchanged',
          },
          {
            isMultiRow: false,
            columns: [numCol('bar')],
            layerId: 'first',
            changeType: 'unchanged',
          },
        ] as TableSuggestion[]
      ).map((table) => {
        const suggestions = getSuggestions({ table, keptLayerIds: [] });
        expect(suggestions.every((suggestion) => suggestion.hide)).toEqual(true);
        expect(suggestions).toHaveLength(10);
      })
    );
  });

  test('marks incomplete as true when no metric is provided', () => {
    expect(
      (
        [
          {
            isMultiRow: true,
            columns: [strCol('foo')],
            layerId: 'first',
            changeType: 'unchanged',
          },
        ] as TableSuggestion[]
      ).map((table) => {
        const suggestions = getSuggestions({ table, keptLayerIds: [] });
        expect(suggestions.every((suggestion) => suggestion.incomplete)).toEqual(true);
        expect(suggestions).toHaveLength(10);
      })
    );
  });

  test('rejects the configuration when metric isStaticValue', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [staticValueCol('value'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestions).toHaveLength(0);
  });

  test('rejects incomplete configurations if there is a state already but no sub visualization id', () => {
    expect(
      (
        [
          {
            isMultiRow: true,
            columns: [dateCol('a')],
            layerId: 'first',
            changeType: 'reduced',
          },
          {
            isMultiRow: false,
            columns: [numCol('bar')],
            layerId: 'first',
            changeType: 'reduced',
          },
        ] as TableSuggestion[]
      ).map((table) => {
        const suggestions = getSuggestions({
          table,
          keptLayerIds: [],
          state: {} as XYState,
        });
        expect(suggestions).toHaveLength(0);
      })
    );
  });

  test('suggests all xy charts without changes to the state when switching among xy charts with malformed table', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: false,
        columns: [numCol('bytes')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
      subVisualizationId: 'area',
      state: {
        legend: { isVisible: true, position: 'bottom' },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: LayerTypes.DATA,
            seriesType: 'bar',
            accessors: ['bytes'],
            splitAccessors: undefined,
          },
          {
            layerId: 'second',
            layerType: LayerTypes.DATA,
            seriesType: 'bar',
            accessors: ['bytes'],
            splitAccessors: undefined,
          },
        ],
      },
    });

    expect(suggestions).toHaveLength(visualizationSubtypes.length);
    expect(suggestions.map(({ state }) => getVisualizationSubtypeId(state))).toEqual([
      'line',
      'bar',
      'bar_horizontal',
      'bar_stacked',
      'bar_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
      'area',
      'area_stacked',
      'area_percentage_stacked',
    ]);
  });

  test('suggests all basic x y charts when switching from another vis', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestions).toHaveLength(visualizationSubtypes.length);
    expect(suggestions.map(({ state }) => getVisualizationSubtypeId(state))).toEqual([
      'bar_stacked',
      'bar',
      'bar_horizontal',
      'bar_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
      'area',
      'area_stacked',
      'area_percentage_stacked',
      'line',
    ]);
  });

  // This limitation is acceptable for now, but is now tested
  test('is unable to generate layers when switching from a non-XY chart with multiple layers', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: ['first', 'second'],
    });

    expect(suggestions).toHaveLength(visualizationSubtypes.length);
    expect(suggestions.map(({ state }) => state.layers.length)).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ]);
    expect(suggestions.map(({ state }) => getVisualizationSubtypeId(state))).toEqual([
      'bar_stacked',
      'bar',
      'bar_horizontal',
      'bar_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
      'area',
      'area_stacked',
      'area_percentage_stacked',
      'line',
    ]);
  });

  test('suggests all basic x y charts when switching from another x y chart', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: ['first'],
      state: {
        legend: { isVisible: true, position: 'bottom' },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: LayerTypes.DATA,
            seriesType: 'bar',
            xAccessor: 'date',
            accessors: ['bytes'],
            splitAccessors: undefined,
          },
        ],
      },
    });

    expect(suggestions).toHaveLength(visualizationSubtypes.length);
    expect(suggestions.map(({ state }) => getVisualizationSubtypeId(state))).toEqual([
      'line',
      'bar',
      'bar_horizontal',
      'bar_stacked',
      'bar_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
      'area',
      'area_stacked',
      'area_percentage_stacked',
    ]);
  });

  test('suggests all basic x y charts when switching from another x y chart with multiple layers', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: ['first', 'second'],
      state: {
        legend: { isVisible: true, position: 'bottom' },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: LayerTypes.DATA,
            seriesType: 'bar',
            xAccessor: 'date',
            accessors: ['bytes'],
            splitAccessors: undefined,
          },
          {
            layerId: 'second',
            layerType: LayerTypes.DATA,
            seriesType: 'bar',
            xAccessor: undefined,
            accessors: [],
            splitAccessors: undefined,
          },
        ],
      },
    });

    expect(suggestions).toHaveLength(visualizationSubtypes.length);
    expect(suggestions.map(({ state }) => getVisualizationSubtypeId(state))).toEqual([
      'line',
      'bar',
      'bar_horizontal',
      'bar_stacked',
      'bar_percentage_stacked',
      'bar_horizontal_stacked',
      'bar_horizontal_percentage_stacked',
      'area',
      'area_stacked',
      'area_percentage_stacked',
    ]);
    expect(suggestions.map(({ state }) => state.layers.map((l) => l.layerId))).toEqual([
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
    ]);
  });

  test('suggests mixed xy chart keeping original subType when switching from another x y chart with multiple layers', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const suggestions = getSuggestions({
      allowMixed: true,
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: ['first', 'second'],
      state: {
        legend: { isVisible: true, position: 'bottom' },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            layerId: 'first',
            layerType: LayerTypes.DATA,
            seriesType: 'bar',
            xAccessor: 'date',
            accessors: ['bytes'],
            splitAccessors: undefined,
          },
          {
            layerId: 'second',
            layerType: LayerTypes.DATA,
            seriesType: 'line',
            xAccessor: undefined,
            accessors: [],
            splitAccessors: undefined,
          },
        ],
      },
    });

    expect(suggestions).toHaveLength(visualizationSubtypes.length);
    expect(suggestions.map(({ state }) => getVisualizationSubtypeId(state))).toEqual([
      'line', // line + line = line
      'mixed', // any other combination is mixed
      'mixed',
      'mixed',
      'mixed',
      'mixed',
      'mixed',
      'mixed',
      'mixed',
      'mixed',
    ]);
    expect(suggestions.map(({ state }) => state.layers.map((l) => l.layerId))).toEqual([
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
      ['first', 'second'],
    ]);
  });

  test('suggests all basic x y chart with date on x', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(visualizationSubtypes.length - 1);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessors": undefined,
          "x": "date",
          "y": Array [
            "bytes",
          ],
        },
      ]
    `);
  });

  test('suggests all basic x y chart with histogram on x', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), histogramCol('duration')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(visualizationSubtypes.length - 1);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessors": undefined,
          "x": "duration",
          "y": Array [
            "bytes",
          ],
        },
      ]
    `);
  });

  test('Does not suggest multiple splits in formBased', () => {
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [
          numCol('price'),
          numCol('quantity'),
          dateCol('date'),
          strCol('product'),
          strCol('city'),
        ],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestions).toHaveLength(0);
  });
  test('Suggest multiple splits in textBased', () => {
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [
          numCol('price'),
          numCol('quantity'),
          dateCol('date'),
          strCol('product'),
          strCol('city'),
        ],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
      datasourceId: 'textBased',
    });

    expect(suggestions).toHaveLength(10);
  });

  test('textBased suggestions retain bucket order for textBased data sources', () => {
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [
          numCol('price'),
          dateCol('date'),
          geoPointCol('origin'),
          gaugeCol('status'),
          ipCol('client'),
        ],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
      datasourceId: 'textBased',
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessors": Array [
            "origin",
            "status",
            "client",
          ],
          "x": "date",
          "y": Array [
            "price",
          ],
        },
      ]
    `);
  });

  test('suggests a split x y chart with date on x', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(visualizationSubtypes.length - 1);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessors": Array [
            "product",
          ],
          "x": "date",
          "y": Array [
            "price",
            "quantity",
          ],
        },
      ]
    `);
  });

  test('uses datasource provided title if available', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'extended',
        label: 'Datasource title',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.title).toEqual('Datasource title');
  });

  test('suggests only stacked bar chart when xy chart is inactive', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [dateCol('date'), numCol('price')],
        layerId: 'first',
        changeType: 'unchanged',
        label: 'Datasource title',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(visualizationSubtypes.length - 1);
    expect(suggestion.title).toEqual('Bar vertical stacked');
    expect(suggestion.state).toEqual(
      expect.objectContaining({
        layers: [
          expect.objectContaining({
            seriesType: 'bar_stacked',
            xAccessor: 'date',
            accessors: ['price'],
            splitAccessors: undefined,
          }),
        ],
      })
    );
  });

  test('passes annotation layer for date histogram data layer', () => {
    const annotationLayer: XYAnnotationLayerConfig = {
      layerId: 'second',
      layerType: LayerTypes.ANNOTATIONS,
      indexPatternId: 'indexPattern1',
      ignoreGlobalFilters: true,
      annotations: [
        {
          id: '1',
          type: 'manual',
          key: {
            type: 'point_in_time',
            timestamp: '2020-20-22',
          },
          label: 'annotation',
        },
      ],
    };
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'Linear',
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'bar',
          splitAccessors: ['product'],
          xAccessor: 'date',
        },
        annotationLayer,
      ],
    };
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      state: currentState,
      keptLayerIds: [],
    });

    suggestions.every((suggestion) =>
      expect(suggestion.state.layers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            layerType: LayerTypes.ANNOTATIONS,
          }),
        ])
      )
    );
  });

  test('does not pass annotation layer if x-axis is not date histogram', () => {
    const annotationLayer: XYAnnotationLayerConfig = {
      layerId: 'second',
      layerType: LayerTypes.ANNOTATIONS,
      indexPatternId: 'indexPattern1',
      ignoreGlobalFilters: true,
      annotations: [
        {
          id: '1',
          type: 'manual',
          key: {
            type: 'point_in_time',
            timestamp: '2020-20-22',
          },
          label: 'annotation',
        },
      ],
    };

    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'Linear',
      layers: [
        {
          layerId: 'first',
          accessors: ['price'],
          seriesType: 'bar',
          layerType: LayerTypes.DATA,
          xAccessor: 'date',
          splitAccessors: ['price2'],
        },
        annotationLayer,
      ],
    };
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date'), numCol('price2')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    suggestions.every((suggestion) =>
      expect(suggestion.state.layers).toEqual(
        expect.arrayContaining([
          expect.not.objectContaining({
            layerType: LayerTypes.ANNOTATIONS,
          }),
        ])
      )
    );
  });

  test('includes passed in palette for split charts if specified', () => {
    const mainPalette: PaletteOutput = { type: 'palette', name: 'mock' };
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
      mainPalette: { type: 'legacyPalette', value: mainPalette },
    });

    expect((suggestion.state.layers as XYDataLayerConfig[])[0].palette).toEqual(mainPalette);
  });

  test('ignores passed in palette for non splitted charts', () => {
    const mainPalette: PaletteOutput = { type: 'palette', name: 'mock' };
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
      mainPalette: { type: 'legacyPalette', value: mainPalette },
    });

    expect((suggestion.state.layers as XYDataLayerConfig[])[0].palette).toEqual(undefined);
  });

  test('hides reduced suggestions if there is a current state', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'reduced',
      },
      state: {
        legend: { isVisible: true, position: 'bottom' },
        valueLabels: 'hide',
        preferredSeriesType: 'bar',
        layers: [
          {
            accessors: ['price', 'quantity'],
            layerId: 'first',
            layerType: LayerTypes.DATA,
            seriesType: 'bar',
            splitAccessors: ['product'],
            xAccessor: 'date',
          },
        ],
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.hide).toBeTruthy();
  });

  test('hides reduced suggestions if xy visualization is not active', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'reduced',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.hide).toBeTruthy();
  });

  test('respects requested sub visualization type if set', () => {
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'reduced',
      },
      keptLayerIds: [],
      subVisualizationId: 'area',
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state.preferredSeriesType).toBe('area');
  });

  test('keeps existing seriesType for initial tables', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      preferredSeriesType: 'line',
      layers: [
        {
          accessors: [],
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'line',
          splitAccessors: undefined,
          xAccessor: '',
        },
      ],
    };
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date')],
        layerId: 'first',
        changeType: 'initial',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(suggestions).toHaveLength(1);

    expect(suggestions[0].hide).toEqual(false);
    expect(suggestions[0].state.preferredSeriesType).toEqual('line');
    expect((suggestions[0].state.layers[0] as XYDataLayerConfig).seriesType).toEqual('line');
  });

  test('suggests bar if changeType is initial and date column is involved', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      fittingFunction: 'None',
      preferredSeriesType: 'bar_stacked',
      layers: [
        {
          accessors: [],
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'bar_stacked',
          splitAccessors: undefined,
          xAccessor: '',
        },
      ],
    };
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date')],
        layerId: 'first',
        changeType: 'initial',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(suggestions).toHaveLength(1);

    expect(suggestions[0].hide).toEqual(false);
    expect(suggestions[0].state.preferredSeriesType).toEqual('bar_stacked');
    expect((suggestions[0].state.layers[0] as XYDataLayerConfig).seriesType).toEqual('bar_stacked');
  });

  test('makes a visible seriesType suggestion for unchanged table without split', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      labelsOrientation: { x: 0, yLeft: -45, yRight: -45 },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'bar',
          splitAccessors: undefined,
          xAccessor: 'date',
        },
      ],
    };
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(suggestions).toHaveLength(visualizationSubtypes.length);

    expect(suggestions[0].hide).toEqual(false);
    expect(suggestions[0].state).toEqual({
      ...currentState,
      preferredSeriesType: 'line',
      layers: [
        {
          ...currentState.layers[0],
          seriesType: 'line',
          colorMapping: DEFAULT_COLOR_MAPPING_CONFIG,
        },
      ],
    });
    expect(suggestions[0].title).toEqual('Line chart');
  });

  test('suggests seriesType and stacking when there is a split', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'Linear',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      labelsOrientation: { x: 0, yLeft: -45, yRight: -45 },
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'bar',
          splitAccessors: ['product'],
          xAccessor: 'date',
        },
      ],
    };
    const [seriesSuggestion, stackSuggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(rest).toHaveLength(visualizationSubtypes.length - 2);
    expect(seriesSuggestion.state).toEqual({
      ...currentState,
      preferredSeriesType: 'line',
      layers: [
        {
          ...currentState.layers[0],
          seriesType: 'line',
          colorMapping: DEFAULT_COLOR_MAPPING_CONFIG,
        },
      ],
    });
    expect(stackSuggestion.state).toEqual({
      ...currentState,
      preferredSeriesType: 'bar_stacked',
      layers: [
        {
          ...currentState.layers[0],
          seriesType: 'bar_stacked',
          colorMapping: DEFAULT_COLOR_MAPPING_CONFIG,
        },
      ],
    });
    expect(seriesSuggestion.title).toEqual('Line chart');
    expect(stackSuggestion.title).toEqual('Bar vertical stacked');
  });

  test('suggests a flipped chart for unchanged table and existing bar chart on ordinal x axis', () => {
    (generateId as jest.Mock).mockReturnValueOnce('dummyCol');
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'bar',
          splitAccessors: ['dummyCol'],
          xAccessor: 'product',
        },
      ],
    };
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      state: currentState,
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(visualizationSubtypes.length - 1);
    expect(suggestion.state.preferredSeriesType).toEqual('bar_horizontal');
    expect(
      (suggestion.state.layers as XYDataLayerConfig[]).every(
        (l) => l.seriesType === 'bar_horizontal'
      )
    ).toBeTruthy();
    expect(suggestion.title).toEqual('Flip');
  });

  test('suggests stacking for unchanged table that has a split', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'Linear',
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'bar',
          splitAccessors: ['date'],
          xAccessor: 'product',
        },
      ],
    };
    const suggestions = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), dateCol('date'), strCol('product')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      state: currentState,
      keptLayerIds: [],
    });

    const visibleSuggestions = suggestions.filter((suggestion) => !suggestion.hide);
    expect(visibleSuggestions).toContainEqual(
      expect.objectContaining({
        title: 'Bar vertical stacked',
        state: expect.objectContaining({ preferredSeriesType: 'bar_stacked' }),
      })
    );
  });

  test('keeps column to dimension mappings on extended tables', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'Linear',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      labelsOrientation: { x: 0, yLeft: -45, yRight: -45 },
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'bar',
          splitAccessors: ['dummyCol'],
          xAccessor: 'product',
        },
      ],
    };
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), strCol('product'), strCol('category')],
        layerId: 'first',
        changeType: 'extended',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state).toEqual({
      ...currentState,
      layers: [
        {
          ...currentState.layers[0],
          xAccessor: 'product',
          splitAccessors: ['category'],
          colorMapping: DEFAULT_COLOR_MAPPING_CONFIG,
        },
      ],
    });
  });

  test('changes column mappings when suggestion is reorder', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'Linear',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      labelsOrientation: { x: 0, yLeft: -45, yRight: -45 },
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'bar',
          splitAccessors: ['category'],
          xAccessor: 'product',
        },
      ],
    };
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [strCol('category'), strCol('product'), numCol('price')],
        layerId: 'first',
        changeType: 'reorder',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state).toEqual({
      ...currentState,
      layers: [
        {
          ...currentState.layers[0],
          xAccessor: 'category',
          splitAccessors: ['product'],
          colorMapping: DEFAULT_COLOR_MAPPING_CONFIG,
        },
      ],
    });
  });

  test('overwrites column to dimension mappings if a date dimension is added', () => {
    (generateId as jest.Mock).mockReturnValueOnce('dummyCol');
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      fittingFunction: 'Linear',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: false, yRight: false },
      labelsOrientation: { x: 0, yLeft: -45, yRight: -45 },
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'bar',
          splitAccessors: ['dummyCol'],
          xAccessor: 'product',
        },
      ],
    };
    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('price'), numCol('quantity'), strCol('product'), dateCol('timestamp')],
        layerId: 'first',
        changeType: 'extended',
      },
      state: currentState,
      keptLayerIds: ['first'],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state).toEqual({
      ...currentState,
      layers: [
        {
          ...currentState.layers[0],
          xAccessor: 'timestamp',
          splitAccessors: ['product'],
          colorMapping: DEFAULT_COLOR_MAPPING_CONFIG,
        },
      ],
    });
  });

  test('handles two numeric values', () => {
    (generateId as jest.Mock).mockReturnValueOnce('ddd');
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('quantity'), numCol('price')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessors": undefined,
          "x": undefined,
          "y": Array [
            "quantity",
            "price",
          ],
        },
      ]
    `);
  });

  test('handles ip', () => {
    (generateId as jest.Mock).mockReturnValueOnce('ddd');
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [
          numCol('quantity'),
          {
            columnId: 'myip',
            operation: {
              dataType: 'ip',
              label: 'Top 5 myip',
              isBucketed: true,
              scale: 'ordinal',
            },
          },
        ],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessors": undefined,
          "x": "myip",
          "y": Array [
            "quantity",
          ],
        },
      ]
    `);
  });

  test('handles unbucketed suggestions', () => {
    (generateId as jest.Mock).mockReturnValueOnce('eee');
    const [suggestion] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [
          numCol('num votes'),
          {
            columnId: 'mybool',
            operation: {
              dataType: 'boolean',
              isBucketed: true,
              label: 'Yes / No',
            },
          },
        ],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: [],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessors": undefined,
          "x": "mybool",
          "y": Array [
            "num votes",
          ],
        },
      ]
    `);
  });

  test('suggests an area stacked chart when current xy chart is bar stacked', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'right' },
      valueLabels: 'hide',
      preferredSeriesType: 'bar_stacked',
      layers: [
        {
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'bar_stacked',
          xAccessor: 'date',
          accessors: ['bytes'],
          splitAccessors: undefined,
        },
      ],
    };

    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: ['first'],
      state: currentState,
    });

    expect(rest).toHaveLength(visualizationSubtypes.length - 1);
    expect(suggestion.title).toEqual('Area stacked');
    expect(suggestion.state).toEqual(
      expect.objectContaining({
        ...currentState,
        preferredSeriesType: 'area_stacked',
        layers: [
          expect.objectContaining({
            ...currentState.layers[0],
            seriesType: 'area_stacked',
          }),
        ],
      })
    );
  });

  test('suggests an area chart when current xy chart is line', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'right' },
      valueLabels: 'hide',
      preferredSeriesType: 'line',
      layers: [
        {
          layerId: 'first',
          layerType: LayerTypes.DATA,
          seriesType: 'line',
          xAccessor: 'date',
          accessors: ['bytes'],
          splitAccessors: undefined,
        },
      ],
    };

    const [suggestion, ...rest] = getSuggestions({
      table: {
        isMultiRow: true,
        columns: [numCol('bytes'), dateCol('date')],
        layerId: 'first',
        changeType: 'unchanged',
      },
      keptLayerIds: ['first'],
      state: currentState,
    });

    expect(rest).toHaveLength(visualizationSubtypes.length - 1);

    expect(suggestion.title).toEqual('Area chart');
    expect(suggestion.state).toEqual(
      expect.objectContaining({
        ...currentState,
        preferredSeriesType: 'area',
        layers: [
          expect.objectContaining({
            ...currentState.layers[0],
            seriesType: 'area',
          }),
        ],
      })
    );
  });

  describe('TS/PromQL prefer line for time series', () => {
    const tsQuery = { esql: 'TS kibana_sample_data_logstsdb' };
    const plainEsqlQuery = {
      esql: 'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY @timestamp',
    };

    test('suggests bar_stacked when query is plain ESQL (no TS/PromQL) in chart switcher', () => {
      const suggestions = getSuggestions({
        table: {
          isMultiRow: true,
          columns: [numCol('bytes'), dateCol('date')],
          layerId: 'first',
          changeType: 'unchanged',
        },
        keptLayerIds: [],
        datasourceId: 'textBased',
        query: plainEsqlQuery,
      });

      const visibleSuggestion = suggestions.find((s) => !s.hide);
      expect(visibleSuggestion).toBeDefined();
      expect(visibleSuggestion!.state.preferredSeriesType).toBe('bar_stacked');
    });

    test('suggests line when query is TS and chart switcher (unchanged, no state)', () => {
      const suggestions = getSuggestions({
        table: {
          isMultiRow: true,
          columns: [numCol('col0'), dateCol('step')],
          layerId: 'first',
          changeType: 'unchanged',
        },
        keptLayerIds: [],
        datasourceId: 'textBased',
        query: tsQuery,
      });

      const visibleSuggestion = suggestions.find((s) => !s.hide);
      expect(visibleSuggestion).toBeDefined();
      expect(visibleSuggestion!.state.preferredSeriesType).toBe('line');
    });

    test('suggests bar_stacked when query is TS but x-axis is not date (ordinal)', () => {
      const suggestions = getSuggestions({
        table: {
          isMultiRow: true,
          columns: [numCol('col0'), strCol('category')],
          layerId: 'first',
          changeType: 'initial',
        },
        keptLayerIds: ['first'],
        datasourceId: 'textBased',
        query: tsQuery,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].state.preferredSeriesType).toBe('bar_stacked');
    });

    test('suggests bar_stacked when no query is passed (changeType initial with date)', () => {
      const suggestions = getSuggestions({
        table: {
          isMultiRow: true,
          columns: [numCol('col0'), dateCol('step')],
          layerId: 'first',
          changeType: 'initial',
        },
        keptLayerIds: ['first'],
        datasourceId: 'textBased',
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].state.preferredSeriesType).toBe('bar_stacked');
    });
  });
});

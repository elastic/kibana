/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuggestions } from './xy_suggestions';
import {
  TableSuggestionColumn,
  VisualizationSuggestion,
  DataType,
  TableSuggestion,
} from '../types';
import { State, XYState } from './types';
import { generateId } from '../id_generator';

jest.mock('../id_generator');

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

  // Helper that plucks out the important part of a suggestion for
  // most test assertions
  function suggestionSubset(suggestion: VisualizationSuggestion<State>) {
    return suggestion.state.layers.map(({ seriesType, splitAccessor, xAccessor, accessors }) => ({
      seriesType,
      splitAccessor,
      x: xAccessor,
      y: accessors,
    }));
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('ignores invalid combinations', () => {
    const unknownCol = () => {
      const str = strCol('foo');
      return { ...str, operation: { ...str.operation, dataType: 'wonkies' as DataType } };
    };

    expect(
      ([
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
          columns: [strCol('foo'), numCol('bar')],
          layerId: 'first',
          changeType: 'unchanged',
        },
        {
          isMultiRow: true,
          columns: [unknownCol(), numCol('bar')],
          layerId: 'first',
          changeType: 'unchanged',
        },
      ] as TableSuggestion[]).map(table =>
        expect(getSuggestions({ table, keptLayerIds: [] })).toEqual([])
      )
    );
  });

  test('suggests a basic x y chart with date on x', () => {
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

    expect(rest).toHaveLength(0);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessor": "aaa",
          "x": "date",
          "y": Array [
            "bytes",
          ],
        },
      ]
    `);
  });

  test('does not suggest multiple splits', () => {
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

    expect(rest).toHaveLength(0);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
      Array [
        Object {
          "seriesType": "bar_stacked",
          "splitAccessor": "product",
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
        changeType: 'unchanged',
        label: 'Datasource title',
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.title).toEqual('Datasource title');
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
        preferredSeriesType: 'bar',
        layers: [
          {
            accessors: ['price', 'quantity'],
            layerId: 'first',
            seriesType: 'bar',
            splitAccessor: 'product',
            xAccessor: 'date',
          },
        ],
      },
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.hide).toBeTruthy();
  });

  test('does not hide reduced suggestions if xy visualization is not active', () => {
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
    expect(suggestion.hide).toBeFalsy();
  });

  test('only makes a seriesType suggestion for unchanged table without split', () => {
    (generateId as jest.Mock).mockReturnValueOnce('dummyCol');
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
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

    expect(suggestions).toHaveLength(1);

    expect(suggestions[0].state).toEqual({
      ...currentState,
      preferredSeriesType: 'line',
      layers: [{ ...currentState.layers[0], seriesType: 'line' }],
    });
    expect(suggestions[0].title).toEqual('Line chart');
  });

  test('suggests seriesType and stacking when there is a split', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'product',
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
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(seriesSuggestion.state).toEqual({
      ...currentState,
      preferredSeriesType: 'line',
      layers: [{ ...currentState.layers[0], seriesType: 'line' }],
    });
    expect(stackSuggestion.state).toEqual({
      ...currentState,
      preferredSeriesType: 'bar_stacked',
      layers: [{ ...currentState.layers[0], seriesType: 'bar_stacked' }],
    });
    expect(seriesSuggestion.title).toEqual('Line chart');
    expect(stackSuggestion.title).toEqual('Stacked');
  });

  test('suggests a flipped chart for unchanged table and existing bar chart on ordinal x axis', () => {
    (generateId as jest.Mock).mockReturnValueOnce('dummyCol');
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
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

    expect(rest).toHaveLength(0);
    expect(suggestion.state.preferredSeriesType).toEqual('bar_horizontal');
    expect(suggestion.state.layers.every(l => l.seriesType === 'bar_horizontal')).toBeTruthy();
    expect(suggestion.title).toEqual('Flip');
  });

  test('suggests stacking for unchanged table that has a split', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'date',
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

    const suggestion = suggestions[suggestions.length - 1];

    expect(suggestion.state).toEqual({
      ...currentState,
      preferredSeriesType: 'bar_stacked',
      layers: [{ ...currentState.layers[0], seriesType: 'bar_stacked' }],
    });
    expect(suggestion.title).toEqual('Stacked');
  });

  test('keeps column to dimension mappings on extended tables', () => {
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
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
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state).toEqual({
      ...currentState,
      layers: [
        {
          ...currentState.layers[0],
          xAccessor: 'product',
          splitAccessor: 'category',
        },
      ],
    });
  });

  test('overwrites column to dimension mappings if a date dimension is added', () => {
    (generateId as jest.Mock).mockReturnValueOnce('dummyCol');
    const currentState: XYState = {
      legend: { isVisible: true, position: 'bottom' },
      preferredSeriesType: 'bar',
      layers: [
        {
          accessors: ['price', 'quantity'],
          layerId: 'first',
          seriesType: 'bar',
          splitAccessor: 'dummyCol',
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
      keptLayerIds: [],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion.state).toEqual({
      ...currentState,
      layers: [
        {
          ...currentState.layers[0],
          xAccessor: 'timestamp',
          splitAccessor: 'product',
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
                            "splitAccessor": "ddd",
                            "x": "quantity",
                            "y": Array [
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
                "splitAccessor": "ddd",
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
              isBucketed: false,
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
                      "splitAccessor": "eee",
                      "x": "mybool",
                      "y": Array [
                        "num votes",
                      ],
                    },
                  ]
            `);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuggestions } from './xy_suggestions';
import { TableColumn, VisualizationSuggestion, DatasourcePublicAPI } from '../types';
import { State } from './types';
import { createMockDatasource } from '../editor_frame_plugin/mocks';

describe('xy_suggestions', () => {
  const datasource: DatasourcePublicAPI = {
    ...createMockDatasource().getPublicAPI({}, jest.fn()),
    generateColumnId: jest.fn(() => 'testcol'),
  };

  function numCol(columnId: string): TableColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        id: `avg_${columnId}`,
        label: `Avg ${columnId}`,
        isBucketed: false,
      },
    };
  }

  function strCol(columnId: string): TableColumn {
    return {
      columnId,
      operation: {
        dataType: 'string',
        id: `terms_${columnId}`,
        label: `Top 5 ${columnId}`,
        isBucketed: true,
      },
    };
  }

  function dateCol(columnId: string): TableColumn {
    return {
      columnId,
      operation: {
        dataType: 'date',
        id: `date_histogram_${columnId}`,
        isBucketed: true,
        label: `${columnId} histogram`,
      },
    };
  }

  // Helper that plucks out the important part of a suggestion for
  // most test assertions
  function suggestionSubset(suggestion: VisualizationSuggestion<State>) {
    const { seriesType, splitSeriesAccessors, stackAccessors, x, y } = suggestion.state;

    return {
      seriesType,
      splitSeriesAccessors,
      stackAccessors,
      x: x.accessor,
      y: y.accessors,
    };
  }

  test('ignores invalid combinations', () => {
    const unknownCol = () => {
      const str = strCol('foo');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { ...str, operation: { ...str.operation, dataType: 'wonkies' } } as any;
    };

    expect(
      getSuggestions({
        datasource,
        tables: [
          { datasourceSuggestionId: 0, isMultiRow: true, columns: [dateCol('a')] },
          { datasourceSuggestionId: 1, isMultiRow: true, columns: [strCol('foo'), strCol('bar')] },
          { datasourceSuggestionId: 2, isMultiRow: false, columns: [strCol('foo'), numCol('bar')] },
          { datasourceSuggestionId: 3, isMultiRow: true, columns: [unknownCol(), numCol('bar')] },
        ],
      })
    ).toEqual([]);
  });

  test('suggests a basic x y chart with date on x', () => {
    const [suggestion, ...rest] = getSuggestions({
      datasource,
      tables: [
        {
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [numCol('bytes'), dateCol('date')],
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
Object {
  "seriesType": "line",
  "splitSeriesAccessors": Array [
    "testcol",
  ],
  "stackAccessors": Array [],
  "x": "date",
  "y": Array [
    "bytes",
  ],
}
`);
  });

  test('suggests a split x y chart with date on x', () => {
    const [suggestion, ...rest] = getSuggestions({
      datasource,
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
Object {
  "seriesType": "line",
  "splitSeriesAccessors": Array [
    "product",
  ],
  "stackAccessors": Array [],
  "x": "date",
  "y": Array [
    "price",
    "quantity",
  ],
}
`);
  });

  test('supports multiple suggestions', () => {
    const [s1, s2, ...rest] = getSuggestions({
      datasource,
      tables: [
        {
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [numCol('price'), dateCol('date')],
        },
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('count'), strCol('country')],
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect([suggestionSubset(s1), suggestionSubset(s2)]).toMatchInlineSnapshot(`
Array [
  Object {
    "seriesType": "line",
    "splitSeriesAccessors": Array [
      "testcol",
    ],
    "stackAccessors": Array [],
    "x": "date",
    "y": Array [
      "price",
    ],
  },
  Object {
    "seriesType": "bar",
    "splitSeriesAccessors": Array [
      "testcol",
    ],
    "stackAccessors": Array [],
    "x": "country",
    "y": Array [
      "count",
    ],
  },
]
`);
  });

  test('handles two numeric values', () => {
    const [suggestion] = getSuggestions({
      datasource,
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('quantity'), numCol('price')],
        },
      ],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
Object {
  "seriesType": "bar",
  "splitSeriesAccessors": Array [
    "testcol",
  ],
  "stackAccessors": Array [],
  "x": "quantity",
  "y": Array [
    "price",
  ],
}
`);
  });

  test('handles unbucketed suggestions', () => {
    const [suggestion] = getSuggestions({
      datasource,
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [
            numCol('num votes'),
            {
              columnId: 'mybool',
              operation: {
                dataType: 'boolean',
                id: 'mybool',
                isBucketed: false,
                label: 'Yes / No',
              },
            },
          ],
        },
      ],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
Object {
  "seriesType": "bar",
  "splitSeriesAccessors": Array [
    "testcol",
  ],
  "stackAccessors": Array [],
  "x": "mybool",
  "y": Array [
    "num votes",
  ],
}
`);
  });
});

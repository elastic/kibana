/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuggestions } from './xy_suggestions';
import { TableSuggestionColumn, VisualizationSuggestion, DataType } from '../types';
import { State } from './types';
import { generateId } from '../id_generator';
import { Ast } from '@kbn/interpreter/target/common';

jest.mock('../id_generator');

describe('xy_suggestions', () => {
  function numCol(columnId: string): TableSuggestionColumn {
    return {
      columnId,
      operation: {
        dataType: 'number',
        label: `Avg ${columnId}`,
        isBucketed: false,
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

  test('ignores invalid combinations', () => {
    const unknownCol = () => {
      const str = strCol('foo');
      return { ...str, operation: { ...str.operation, dataType: 'wonkies' as DataType } };
    };

    expect(
      getSuggestions({
        tables: [
          {
            datasourceSuggestionId: 0,
            isMultiRow: true,
            columns: [dateCol('a')],
            layerId: 'first',
          },
          {
            datasourceSuggestionId: 1,
            isMultiRow: true,
            columns: [strCol('foo'), strCol('bar')],
            layerId: 'first',
          },
          {
            datasourceSuggestionId: 2,
            isMultiRow: false,
            columns: [strCol('foo'), numCol('bar')],
            layerId: 'first',
          },
          {
            datasourceSuggestionId: 3,
            isMultiRow: true,
            columns: [unknownCol(), numCol('bar')],
            layerId: 'first',
          },
        ],
      })
    ).toEqual([]);
  });

  test('suggests a basic x y chart with date on x', () => {
    (generateId as jest.Mock).mockReturnValueOnce('aaa');
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [numCol('bytes'), dateCol('date')],
          layerId: 'first',
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "seriesType": "bar",
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
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [
            numCol('price'),
            numCol('quantity'),
            dateCol('date'),
            strCol('product'),
            strCol('city'),
          ],
          layerId: 'first',
        },
      ],
    });

    expect(suggestions).toHaveLength(0);
  });

  test('suggests a split x y chart with date on x', () => {
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('price'), numCol('quantity'), dateCol('date'), strCol('product')],
          layerId: 'first',
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "seriesType": "line",
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

  test('supports multiple suggestions', () => {
    (generateId as jest.Mock).mockReturnValueOnce('bbb').mockReturnValueOnce('ccc');
    const [s1, s2, ...rest] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [numCol('price'), dateCol('date')],
          layerId: 'first',
        },
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('count'), strCol('country')],
          layerId: 'first',
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect([suggestionSubset(s1), suggestionSubset(s2)]).toMatchInlineSnapshot(`
                  Array [
                    Array [
                      Object {
                        "seriesType": "bar",
                        "splitAccessor": "bbb",
                        "x": "date",
                        "y": Array [
                          "price",
                        ],
                      },
                    ],
                    Array [
                      Object {
                        "seriesType": "bar",
                        "splitAccessor": "ccc",
                        "x": "country",
                        "y": Array [
                          "count",
                        ],
                      },
                    ],
                  ]
            `);
  });

  test('handles two numeric values', () => {
    (generateId as jest.Mock).mockReturnValueOnce('ddd');
    const [suggestion] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 1,
          isMultiRow: true,
          columns: [numCol('quantity'), numCol('price')],
          layerId: 'first',
        },
      ],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "seriesType": "bar",
                      "splitAccessor": "ddd",
                      "x": "quantity",
                      "y": Array [
                        "price",
                      ],
                    },
                  ]
            `);
  });

  test('handles unbucketed suggestions', () => {
    (generateId as jest.Mock).mockReturnValueOnce('eee');
    const [suggestion] = getSuggestions({
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
                isBucketed: false,
                label: 'Yes / No',
              },
            },
          ],
          layerId: 'first',
        },
      ],
    });

    expect(suggestionSubset(suggestion)).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "seriesType": "bar",
                      "splitAccessor": "eee",
                      "x": "mybool",
                      "y": Array [
                        "num votes",
                      ],
                    },
                  ]
            `);
  });

  test('adds a preview expression with disabled axes and legend', () => {
    const [suggestion] = getSuggestions({
      tables: [
        {
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [numCol('bytes'), dateCol('date')],
          layerId: 'first',
        },
      ],
    });

    const expression = suggestion.previewExpression! as Ast;

    expect(
      (expression.chain[0].arguments.legend[0] as Ast).chain[0].arguments.isVisible[0]
    ).toBeFalsy();
    expect(
      (expression.chain[0].arguments.layers[0] as Ast).chain[0].arguments.hide[0]
    ).toBeTruthy();
  });
});

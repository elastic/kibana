/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSuggestions } from './metric_suggestions';
import { TableSuggestionColumn } from '..';

describe('metric_suggestions', () => {
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

  test('ignores invalid combinations', () => {
    const unknownCol = () => {
      const str = strCol('foo');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return { ...str, operation: { ...str.operation, dataType: 'wonkies' } } as any;
    };

    expect(
      getSuggestions({
        tables: [
          { columns: [dateCol('a')], datasourceSuggestionId: 0, isMultiRow: true, layerId: 'l1' },
          {
            columns: [strCol('foo'), strCol('bar')],
            datasourceSuggestionId: 1,
            isMultiRow: true,
            layerId: 'l1',
          },
          { layerId: 'l1', datasourceSuggestionId: 2, isMultiRow: true, columns: [numCol('bar')] },
          {
            columns: [unknownCol(), numCol('bar')],
            datasourceSuggestionId: 3,
            isMultiRow: true,
            layerId: 'l1',
          },
          {
            columns: [numCol('bar'), numCol('baz')],
            datasourceSuggestionId: 4,
            isMultiRow: false,
            layerId: 'l1',
          },
        ],
      })
    ).toEqual([]);
  });

  test('suggests a basic metric chart', () => {
    const [suggestion, ...rest] = getSuggestions({
      tables: [
        {
          columns: [numCol('bytes')],
          datasourceSuggestionId: 0,
          isMultiRow: false,
          layerId: 'l1',
        },
      ],
    });

    expect(rest).toHaveLength(0);
    expect(suggestion).toMatchInlineSnapshot(`
      Object {
        "datasourceSuggestionId": 0,
        "previewExpression": Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "accessor": Array [
                  "bytes",
                ],
                "title": Array [
                  "",
                ],
              },
              "function": "lens_metric_chart",
              "type": "function",
            },
          ],
          "type": "expression",
        },
        "previewIcon": "visMetric",
        "score": 1,
        "state": Object {
          "accessor": "bytes",
          "layerId": "l1",
        },
        "title": "Avg bytes",
      }
    `);
  });
});

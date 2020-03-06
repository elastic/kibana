/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDataGridSorting } from '@elastic/eui';

import {
  getPreviewRequestBody,
  PivotAggsConfig,
  PivotGroupByConfig,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
  SimpleQuery,
} from '../../../../common';

import {
  multiColumnSortFactory,
  getPivotPreviewDevConsoleStatement,
  getPivotDropdownOptions,
} from './common';
import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';

describe('Transform: Define Pivot Common', () => {
  test('customSortFactory()', () => {
    const data = [
      { s: 'a', n: 1 },
      { s: 'a', n: 2 },
      { s: 'b', n: 3 },
      { s: 'b', n: 4 },
    ];

    const sortingColumns1: EuiDataGridSorting['columns'] = [{ id: 's', direction: 'desc' }];
    const multiColumnSort1 = multiColumnSortFactory(sortingColumns1);
    data.sort(multiColumnSort1);

    expect(data).toStrictEqual([
      { s: 'b', n: 3 },
      { s: 'b', n: 4 },
      { s: 'a', n: 1 },
      { s: 'a', n: 2 },
    ]);

    const sortingColumns2: EuiDataGridSorting['columns'] = [
      { id: 's', direction: 'asc' },
      { id: 'n', direction: 'desc' },
    ];
    const multiColumnSort2 = multiColumnSortFactory(sortingColumns2);
    data.sort(multiColumnSort2);

    expect(data).toStrictEqual([
      { s: 'a', n: 2 },
      { s: 'a', n: 1 },
      { s: 'b', n: 4 },
      { s: 'b', n: 3 },
    ]);

    const sortingColumns3: EuiDataGridSorting['columns'] = [
      { id: 'n', direction: 'desc' },
      { id: 's', direction: 'desc' },
    ];
    const multiColumnSort3 = multiColumnSortFactory(sortingColumns3);
    data.sort(multiColumnSort3);

    expect(data).toStrictEqual([
      { s: 'b', n: 4 },
      { s: 'b', n: 3 },
      { s: 'a', n: 2 },
      { s: 'a', n: 1 },
    ]);
  });

  test('getPivotDropdownOptions()', () => {
    // The field name includes the characters []> as well as a leading and ending space charcter
    // which cannot be used for aggregation names. The test results verifies that the characters
    // should still be present in field and dropDownName values, but should be stripped for aggName values.
    const indexPattern = {
      id: 'the-index-pattern-id',
      title: 'the-index-pattern-title',
      fields: [
        {
          name: ' the-f[i]e>ld ',
          type: 'number',
          aggregatable: true,
          filterable: true,
          searchable: true,
        },
      ],
    } as IndexPattern;

    const options = getPivotDropdownOptions(indexPattern);

    expect(options).toEqual({
      aggOptions: [
        {
          label: ' the-f[i]e>ld ',
          options: [
            { label: 'avg( the-f[i]e>ld )' },
            { label: 'cardinality( the-f[i]e>ld )' },
            { label: 'max( the-f[i]e>ld )' },
            { label: 'min( the-f[i]e>ld )' },
            { label: 'sum( the-f[i]e>ld )' },
            { label: 'value_count( the-f[i]e>ld )' },
          ],
        },
      ],
      aggOptionsData: {
        'avg( the-f[i]e>ld )': {
          agg: 'avg',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.avg',
          dropDownName: 'avg( the-f[i]e>ld )',
        },
        'cardinality( the-f[i]e>ld )': {
          agg: 'cardinality',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.cardinality',
          dropDownName: 'cardinality( the-f[i]e>ld )',
        },
        'max( the-f[i]e>ld )': {
          agg: 'max',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.max',
          dropDownName: 'max( the-f[i]e>ld )',
        },
        'min( the-f[i]e>ld )': {
          agg: 'min',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.min',
          dropDownName: 'min( the-f[i]e>ld )',
        },
        'sum( the-f[i]e>ld )': {
          agg: 'sum',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.sum',
          dropDownName: 'sum( the-f[i]e>ld )',
        },
        'value_count( the-f[i]e>ld )': {
          agg: 'value_count',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field.value_count',
          dropDownName: 'value_count( the-f[i]e>ld )',
        },
      },
      groupByOptions: [{ label: 'histogram( the-f[i]e>ld )' }],
      groupByOptionsData: {
        'histogram( the-f[i]e>ld )': {
          agg: 'histogram',
          field: ' the-f[i]e>ld ',
          aggName: 'the-field',
          dropDownName: 'histogram( the-f[i]e>ld )',
          interval: '10',
        },
      },
    });
  });

  test('getPivotPreviewDevConsoleStatement()', () => {
    const query: SimpleQuery = {
      query_string: {
        query: '*',
        default_operator: 'AND',
      },
    };
    const groupBy: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-group-by-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const agg: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-agg-field',
      aggName: 'the-agg-agg-name',
      dropDownName: 'the-agg-drop-down-name',
    };
    const request = getPreviewRequestBody('the-index-pattern-title', query, [groupBy], [agg]);
    const pivotPreviewDevConsoleStatement = getPivotPreviewDevConsoleStatement(request);

    expect(pivotPreviewDevConsoleStatement).toBe(`POST _transform/_preview
{
  "source": {
    "index": [
      "the-index-pattern-title"
    ]
  },
  "pivot": {
    "group_by": {
      "the-group-by-agg-name": {
        "terms": {
          "field": "the-group-by-field"
        }
      }
    },
    "aggregations": {
      "the-agg-agg-name": {
        "avg": {
          "field": "the-agg-field"
        }
      }
    }
  }
}
`);
  });
});

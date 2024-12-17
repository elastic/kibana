/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { SimpleQuery } from '@kbn/ml-query-utils';

import { getPreviewTransformRequestBody } from '.';
import { getIndexDevConsoleStatement, getTransformPreviewDevConsoleStatement } from './data_grid';

describe('Transform: Data Grid', () => {
  test('getTransformPreviewDevConsoleStatement()', () => {
    const query: SimpleQuery = {
      query_string: {
        query: '*',
        default_operator: 'AND',
      },
    };

    const request = getPreviewTransformRequestBody(
      { getIndexPattern: () => 'the-index-pattern-title' } as DataView,
      query,
      {
        pivot: {
          group_by: {
            'the-group-by-agg-name': {
              terms: {
                field: 'the-group-by-field',
              },
            },
          },
          aggregations: {
            'the-agg-agg-name': {
              avg: {
                field: 'the-agg-field',
              },
            },
          },
        },
      }
    );

    const pivotPreviewDevConsoleStatement = getTransformPreviewDevConsoleStatement(request);

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

describe('Transform: Index Preview Common', () => {
  test('getIndexDevConsoleStatement()', () => {
    const query: SimpleQuery = {
      query_string: {
        query: '*',
        default_operator: 'AND',
      },
    };
    const indexPreviewDevConsoleStatement = getIndexDevConsoleStatement(
      query,
      'the-index-pattern-title'
    );

    expect(indexPreviewDevConsoleStatement).toBe(`GET the-index-pattern-title/_search
{
  "query": {
    "query_string": {
      "query": "*",
      "default_operator": "AND"
    }
  }
}
`);
  });
});

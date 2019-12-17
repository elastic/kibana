/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';
import { defaultRequestParameters, getMlResultIndex } from './common';

export const createTopLogEntryCategoriesQuery = (
  logEntryCategoriesJobId: string,
  startTime: number,
  endTime: number,
  size: number,
  sortDirection: 'asc' | 'desc' = 'desc'
) => ({
  ...defaultRequestParameters,
  body: {
    query: {
      bool: {
        filter: [
          {
            range: {
              timestamp: {
                gte: startTime,
                lte: endTime,
              },
            },
          },
          {
            term: {
              result_type: {
                value: 'model_plot',
              },
            },
          },
          {
            range: {
              actual: {
                gt: 0,
              },
            },
          },
        ],
      },
    },
    aggs: {
      terms_category_id: {
        terms: {
          field: 'by_field_value',
          size,
          order: {
            sum_actual: sortDirection,
          },
        },
        aggs: {
          sum_actual: {
            sum: {
              field: 'actual',
            },
          },
          terms_dataset: {
            terms: {
              field: 'partition_field_value',
              size: 1000,
            },
          },
        },
      },
    },
  },
  index: getMlResultIndex(logEntryCategoriesJobId),
  size: 0,
});

export const logEntryCategoryBucketRT = rt.type({
  key: rt.string,
  doc_count: rt.number,
  sum_actual: rt.type({
    value: rt.number,
  }),
  terms_dataset: rt.type({
    buckets: rt.array(
      rt.type({
        key: rt.string,
        doc_count: rt.number,
      })
    ),
  }),
});

export type LogEntryCategoryBucket = rt.TypeOf<typeof logEntryCategoryBucketRT>;

export const topLogEntryCategoriesResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    aggregations: rt.type({
      terms_category_id: rt.type({
        buckets: rt.array(logEntryCategoryBucketRT),
      }),
    }),
  }),
]);

export type TopLogEntryCategoriesResponse = rt.TypeOf<typeof topLogEntryCategoriesResponseRT>;

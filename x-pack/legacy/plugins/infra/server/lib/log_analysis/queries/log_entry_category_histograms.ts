/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';
import { defaultRequestParameters, getMlResultIndex } from './common';

export const createLogEntryCategoryHistogramsQuery = (
  logEntryCategoriesJobId: string,
  categoryIds: number[],
  startTime: number,
  endTime: number,
  bucketDuration: number
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
            terms: {
              by_field_value: categoryIds,
            },
          },
        ],
      },
    },
    aggs: {
      filters_categories: {
        filters: {
          filters: categoryIds.reduce<Record<string, { term: { by_field_value: number } }>>(
            (categoryFilters, categoryId) => ({
              ...categoryFilters,
              [`${categoryId}`]: {
                term: {
                  by_field_value: categoryId,
                },
              },
            }),
            {}
          ),
        },
        aggs: {
          date_histogram_timestamp: {
            date_histogram: {
              field: 'timestamp',
              fixed_interval: `${bucketDuration}ms`,
            },
            aggs: {
              sum_actual: {
                sum: {
                  field: 'actual',
                },
              },
            },
          },
        },
      },
    },
  },
  index: getMlResultIndex(logEntryCategoriesJobId),
  size: 0,
});

export const logEntryCategoryFilterBucketRT = rt.type({
  doc_count: rt.number,
  date_histogram_timestamp: rt.type({
    buckets: rt.array(
      rt.type({
        key: rt.number,
        doc_count: rt.number,
        sum_actual: rt.type({
          value: rt.number,
        }),
      })
    ),
  }),
});

export type LogEntryCategoryFilterBucket = rt.TypeOf<typeof logEntryCategoryFilterBucketRT>;

export const logEntryCategoryHistogramsResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    aggregations: rt.type({
      filters_categories: rt.type({
        buckets: rt.record(rt.string, logEntryCategoryFilterBucketRT),
      }),
    }),
  }),
]);

export type LogEntryCategorHistogramsResponse = rt.TypeOf<
  typeof logEntryCategoryHistogramsResponseRT
>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseFilterQuery } from '../../utils/serialized_query';

interface RangeBucket {
  from: number;
  to: number;
}

export const generateRangeBuckets = (
  startDate: number,
  endDate: number,
  bucketSize: number
): RangeBucket[] => {
  const ranges: RangeBucket[] = [];

  for (let from = startDate; from <= endDate; from += bucketSize) {
    ranges.push({ from, to: from + bucketSize });
  }

  return ranges;
};

interface LogSummaryQueryBodyParams {
  startDate: number;
  endDate: number;
  bucketSize: number;
  timestampField: string;
  tiebreakerField: string;
  query?: string | null; // FIXME "null" shouldn't be necessary here
  highlightQuery?: object;
}

const TIMESTAMP_FORMAT = 'epoch_millis';

export const buildLogSummaryQueryBody = ({
  startDate,
  endDate,
  bucketSize,
  timestampField,
  tiebreakerField,
  query,
  highlightQuery,
}: LogSummaryQueryBodyParams) => {
  const filters = [parseFilterQuery(query), highlightQuery].filter(_ => _);

  return {
    size: 0,
    query: {
      bool: {
        filter: [
          ...(filters.length === 2 ? [{ bool: { must: filters } }] : filters),
          {
            range: { [timestampField]: { gte: startDate, lte: endDate, format: TIMESTAMP_FORMAT } },
          },
        ],
      },
    },
    aggs: {
      log_summary: {
        date_range: {
          field: timestampField,
          format: TIMESTAMP_FORMAT,
          ranges: generateRangeBuckets(startDate, endDate, bucketSize),
        },
        ...(highlightQuery
          ? {
              aggregations: {
                top_hits_by_key: {
                  top_hits: {
                    size: 1,
                    sort: [{ [timestampField]: 'asc' }, { [tiebreakerField]: 'asc' }],
                    _source: false,
                  },
                },
              },
            }
          : {}),
      },
    },
    sort: [{ [timestampField]: 'asc', [tiebreakerField]: 'asc' }],
  };
};

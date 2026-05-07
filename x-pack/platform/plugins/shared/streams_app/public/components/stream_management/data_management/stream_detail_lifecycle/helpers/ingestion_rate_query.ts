/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';

export const ingestionRateQuery = ({
  index,
  start,
  end,
  timestampField = '@timestamp',
  bucketCount = 10,
}: {
  index: string;
  start: string;
  end: string;
  timestampField?: string;
  bucketCount?: number;
}) => {
  const startDate = datemath.parse(start);
  const endDate = datemath.parse(end);
  if (!startDate || !endDate) {
    throw new Error(`Expected a valid start and end date but got [start: ${start} | end: ${end}]`);
  }

  const intervalInSeconds = Math.max(
    Math.round(endDate.diff(startDate, 'seconds') / bucketCount),
    1
  );

  return {
    index,
    track_total_hits: false,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [{ range: { [timestampField]: { gte: start, lte: end } } }],
        },
      },
      aggs: {
        docs_count: {
          date_histogram: {
            field: timestampField,
            fixed_interval: `${intervalInSeconds}s`,
            min_doc_count: 0,
          },
        },
      },
    },
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

export const buildEventsOverTimeQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
}: RequestBasicOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    index: defaultIndex,
    allowNoIndices: true,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        events: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: '36',
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};

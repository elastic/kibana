/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';
import { calculateTimeseriesInterval } from './calculate_timeseries_interval';

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

  const getHistogramAggregation = () => {
    const interval = calculateTimeseriesInterval(from, to, 1);
    const histogramTimestampField = '@timestamp';
    if (interval != null)
      return {
        date_histogram: {
          field: histogramTimestampField,
          fixed_interval: `${interval}s`,
        },
      };
    else
      return {
        auto_date_histogram: {
          field: histogramTimestampField,
          buckets: 36,
        },
      };
  };

  const dslQuery = {
    index: defaultIndex,
    allowNoIndices: true,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        events: getHistogramAggregation(),
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

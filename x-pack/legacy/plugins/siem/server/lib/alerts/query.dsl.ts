/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses, calculateTimeseriesInterval } from '../../utils/build_query';
import { buildTimelineQuery } from '../events/query.dsl';
import { RequestOptions, MatrixHistogramRequestOptions } from '../framework';

export const buildAlertsQuery = (options: RequestOptions) => {
  const eventsQuery = buildTimelineQuery(options);
  const eventsFilter = eventsQuery.body.query.bool.filter;
  const alertsFilter = [
    ...createQueryFilterClauses({ match: { 'event.kind': { query: 'alert' } } }),
  ];

  return {
    ...eventsQuery,
    body: {
      ...eventsQuery.body,
      query: {
        bool: {
          filter: [...eventsFilter, ...alertsFilter],
        },
      },
    },
  };
};

export const buildAlertsHistogramQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
  stackByField,
}: MatrixHistogramRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      bool: {
        filter: [
          {
            bool: {
              should: [
                {
                  match: {
                    'event.kind': 'alert',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
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
    const interval = calculateTimeseriesInterval(from, to);
    const histogramTimestampField = '@timestamp';
    const dateHistogram = {
      date_histogram: {
        field: histogramTimestampField,
        fixed_interval: `${interval}s`,
      },
    };
    const autoDateHistogram = {
      auto_date_histogram: {
        field: histogramTimestampField,
        buckets: 36,
      },
    };
    return {
      alertsByModuleGroup: {
        terms: {
          field: stackByField,
          missing: 'All others',
          order: {
            _count: 'desc',
          },
          size: 10,
        },
        aggs: {
          alerts: interval ? dateHistogram : autoDateHistogram,
        },
      },
    };
  };

  const dslQuery = {
    index: defaultIndex,
    allowNoIndices: true,
    ignoreUnavailable: true,
    body: {
      aggregations: getHistogramAggregation(),
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

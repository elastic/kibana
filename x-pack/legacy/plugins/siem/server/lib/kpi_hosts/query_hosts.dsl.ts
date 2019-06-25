/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { KpiHostsESMSearchBody, RequestKpiHostsOptions } from './types';
import { isKpiHostDetailsOptions } from './helpers';

export const buildHostsQuery = (options: RequestKpiHostsOptions): KpiHostsESMSearchBody[] => {
  const {
    filterQuery,
    timerange: { from, to },
    defaultIndex,
    sourceConfiguration: {
      fields: { timestamp },
    },
  } = options;

  const kpiHostsFilter = [
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

  const filter = isKpiHostDetailsOptions(options)
    ? [...kpiHostsFilter, { term: { 'host.name': options.hostName } }]
    : kpiHostsFilter;

  const dslQuery = [
    {
      index: defaultIndex,
      allowNoIndices: true,
      ignoreUnavailable: true,
    },
    {
      aggregations: {
        hosts: {
          cardinality: {
            field: 'host.name',
          },
        },
        hosts_histogram: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: '6',
          },
          aggs: {
            count: {
              cardinality: {
                field: 'host.name',
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: false,
    },
  ];

  return dslQuery;
};

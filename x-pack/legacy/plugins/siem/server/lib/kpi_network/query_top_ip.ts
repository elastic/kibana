/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

import { KpiNetworkESMSearchBody } from './types';

const getAggs = (attrAuery: 'source' | 'destination') => ({
  [`top${attrAuery}Ip`]: {
    terms: {
      field: `${attrAuery}.ip`,
      order: {
        '1': 'desc',
      },
      size: 5,
    },
    aggs: {
      sourceBytes: {
        sum: {
          field: 'source.bytes',
        },
      },
      destinationBytes: {
        sum: {
          field: 'destination.bytes',
        },
      },
    },
  },
});

export const buildDnsQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
}: RequestBasicOptions): KpiNetworkESMSearchBody[] => {
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

  const dslQuery = [
    {
      index: defaultIndex,
      allowNoIndices: true,
      ignoreUnavailable: true,
    },
    {
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        ...getAggs('source'),
        ...getAggs('destination'),
      },
      size: 0,
      track_total_hits: true,
    },
  ];

  return dslQuery;
};

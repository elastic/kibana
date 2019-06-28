/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { getBytesAggs } from './helpers';
import { KpiNetworkESMSearchBody } from './types';
import { RequestBasicOptions } from '../framework';

const getAggs = (attrAuery: 'source' | 'destination') => ({
  [`top${attrAuery}Ports`]: {
    terms: {
      field: `${attrAuery}.port`,
      order: {
        [`${attrAuery}.port`]: 'desc',
      },
      size: 5,
    },
    ...getBytesAggs(),
  },
});

export const buildTopPortsQuery = ({
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
        ...getAggs('destination'),
      },
      size: 0,
      track_total_hits: true,
    },
  ];

  return dslQuery;
};

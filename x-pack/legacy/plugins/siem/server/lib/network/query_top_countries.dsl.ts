/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  FlowTargetNew,
  NetworkTopNFlowSortField,
  NetworkTopNFlowFields,
} from '../../graphql/types';
import { assertUnreachable, createQueryFilterClauses } from '../../utils/build_query';

import { NetworkTopCountriesRequestOptions } from './index';

const getCountAgg = (flowTarget: FlowTargetNew) => ({
  top_countries_count: {
    cardinality: {
      field: `${flowTarget}.geo.country_iso_code`,
    },
  },
});

export const buildTopCountriesQuery = ({
  defaultIndex,
  filterQuery,
  flowTarget,
  networkTopCountriesSort,
  pagination: { querySize },
  sourceConfiguration: {
    fields: { timestamp },
  },
  timerange: { from, to },
}: NetworkTopCountriesRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    { range: { [timestamp]: { gte: from, lte: to } } },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...getCountAgg(flowTarget),
        ...getFlowTargetAggs(networkTopCountriesSort, flowTarget, querySize),
      },
      query: {
        bool: {
          filter,
        },
      },
    },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};

const getFlowTargetAggs = (
  networkTopCountriesSortField: NetworkTopNFlowSortField,
  flowTarget: FlowTargetNew,
  querySize: number
) => ({
  [flowTarget]: {
    terms: {
      field: `${flowTarget}.geo.country_iso_code`,
      size: querySize,
      order: {
        ...getQueryOrder(networkTopCountriesSortField),
      },
    },
    aggs: {
      bytes_in: {
        sum: {
          field: `${getOppositeField(flowTarget)}.bytes`,
        },
      },
      bytes_out: {
        sum: {
          field: `${flowTarget}.bytes`,
        },
      },
      flows: {
        cardinality: {
          field: 'network.community_id',
        },
      },
      source_ips: {
        cardinality: {
          field: 'source.ip',
        },
      },
      destination_ips: {
        cardinality: {
          field: 'destination.ip',
        },
      },
    },
  },
});

export const getOppositeField = (flowTarget: FlowTargetNew): FlowTargetNew => {
  switch (flowTarget) {
    case FlowTargetNew.source:
      return FlowTargetNew.destination;
    case FlowTargetNew.destination:
      return FlowTargetNew.source;
  }
  assertUnreachable(flowTarget);
};

type QueryOrder =
  | { bytes_in: Direction }
  | { bytes_out: Direction }
  | { flows: Direction }
  | { destination_ips: Direction }
  | { source_ips: Direction };

const getQueryOrder = (networkTopCountriesSortField: NetworkTopNFlowSortField): QueryOrder => {
  switch (networkTopCountriesSortField.field) {
    case NetworkTopNFlowFields.bytes_in:
      return { bytes_in: networkTopCountriesSortField.direction };
    case NetworkTopNFlowFields.bytes_out:
      return { bytes_out: networkTopCountriesSortField.direction };
    case NetworkTopNFlowFields.flows:
      return { flows: networkTopCountriesSortField.direction };
    case NetworkTopNFlowFields.destination_ips:
      return { destination_ips: networkTopCountriesSortField.direction };
    case NetworkTopNFlowFields.source_ips:
      return { source_ips: networkTopCountriesSortField.direction };
  }
  assertUnreachable(networkTopCountriesSortField.field);
};

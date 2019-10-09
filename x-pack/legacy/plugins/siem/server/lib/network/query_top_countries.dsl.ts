/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  FlowTargetNew,
  NetworkTopCountriesSortField,
  NetworkTopCountriesFields,
} from '../../graphql/types';
import { assertUnreachable, createQueryFilterClauses } from '../../utils/build_query';

import { NetworkTopCountriesRequestOptions } from './index';

const getCountAgg = (flowTarget: FlowTargetNew) => ({
  top_n_flow_count: {
    cardinality: {
      field: `${flowTarget}.ip`,
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
  networkTopCountriesSortField: NetworkTopCountriesSortField,
  flowTarget: FlowTargetNew,
  querySize: number
) => ({
  [flowTarget]: {
    terms: {
      field: `${flowTarget}.ip`,
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
      domain: {
        terms: {
          field: `${flowTarget}.domain`,
          order: {
            timestamp: 'desc',
          },
        },
        aggs: {
          timestamp: {
            max: {
              field: '@timestamp',
            },
          },
        },
      },
      location: {
        filter: {
          exists: {
            field: `${flowTarget}.geo`,
          },
        },
        aggs: {
          top_geo: {
            top_hits: {
              _source: `${flowTarget}.geo.*`,
              size: 1,
            },
          },
        },
      },
      autonomous_system: {
        filter: {
          exists: {
            field: `${flowTarget}.as`,
          },
        },
        aggs: {
          top_as: {
            top_hits: {
              _source: `${flowTarget}.as.*`,
              size: 1,
            },
          },
        },
      },
      flows: {
        cardinality: {
          field: 'network.community_id',
        },
      },
      [`${getOppositeField(flowTarget)}_ips`]: {
        cardinality: {
          field: `${getOppositeField(flowTarget)}.ip`,
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

const getQueryOrder = (networkTopCountriesSortField: NetworkTopCountriesSortField): QueryOrder => {
  switch (networkTopCountriesSortField.field) {
    case NetworkTopCountriesFields.bytes_in:
      return { bytes_in: networkTopCountriesSortField.direction };
    case NetworkTopCountriesFields.bytes_out:
      return { bytes_out: networkTopCountriesSortField.direction };
    case NetworkTopCountriesFields.flows:
      return { flows: networkTopCountriesSortField.direction };
    case NetworkTopCountriesFields.destination_ips:
      return { destination_ips: networkTopCountriesSortField.direction };
    case NetworkTopCountriesFields.source_ips:
      return { source_ips: networkTopCountriesSortField.direction };
  }
  assertUnreachable(networkTopCountriesSortField.field);
};

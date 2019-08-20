/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  FlowTarget,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
} from '../../graphql/types';
import { assertUnreachable, createQueryFilterClauses } from '../../utils/build_query';

import { NetworkTopNFlowRequestOptions } from './index';

const getCountAgg = (flowTarget: FlowTarget) => ({
  top_n_flow_count: {
    cardinality: {
      field: `${flowTarget}.ip`,
    },
  },
});

export const buildTopNFlowQuery = ({
  defaultIndex,
  filterQuery,
  flowTarget,
  networkTopNFlowSort,
  pagination: { querySize },
  sourceConfiguration: {
    fields: { timestamp },
  },
  timerange: { from, to },
}: NetworkTopNFlowRequestOptions) => {
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
        ...getFlowTargetAggs(networkTopNFlowSort, flowTarget, querySize),
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

const generateFlowTargetAggs = (
  networkTopNFlowSortField: NetworkTopNFlowSortField,
  flowTarget: FlowTarget.source | FlowTarget.destination,
  querySize: number
) => ({
  [flowTarget]: {
    terms: {
      field: `${flowTarget}.ip`,
      size: querySize,
      order: {
        ...getQueryOrder(networkTopNFlowSortField),
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
    },
  },
});

const getFlowTargetAggs = (
  networkTopNFlowSortField: NetworkTopNFlowSortField,
  flowTarget: FlowTarget.source | FlowTarget.destination,
  querySize: number
) => {
  return generateFlowTargetAggs(networkTopNFlowSortField, flowTarget, querySize);
};

const getOppositeField = (flowTarget: FlowTarget): FlowTarget => {
  switch (flowTarget) {
    case FlowTarget.source:
      return FlowTarget.destination;
    case FlowTarget.destination:
      return FlowTarget.source;
    case FlowTarget.server:
      return FlowTarget.client;
    case FlowTarget.client:
      return FlowTarget.server;
  }
  assertUnreachable(flowTarget);
};

type QueryOrder = { bytes: Direction } | { packets: Direction } | { ip_count: Direction };

const getQueryOrder = (networkTopNFlowSortField: NetworkTopNFlowSortField): QueryOrder => {
  switch (networkTopNFlowSortField.field) {
    case NetworkTopNFlowFields.bytes:
      return { bytes: networkTopNFlowSortField.direction };
    case NetworkTopNFlowFields.packets:
      return { packets: networkTopNFlowSortField.direction };
    case NetworkTopNFlowFields.ipCount:
      return { ip_count: networkTopNFlowSortField.direction };
  }
  assertUnreachable(networkTopNFlowSortField.field);
};

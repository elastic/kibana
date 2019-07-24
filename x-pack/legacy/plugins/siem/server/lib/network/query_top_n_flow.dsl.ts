/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  FlowDirection,
  FlowTarget,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
} from '../../graphql/types';
import { createQueryFilterClauses } from '../../utils/build_query';

import { NetworkTopNFlowRequestOptions } from './index';

const getDirectionalFilter = (flowDirection: FlowDirection) => {
  switch (flowDirection) {
    case FlowDirection.uniDirectional:
      return {
        must: [
          {
            exists: {
              field: 'source.bytes',
            },
          },
        ],
        must_not: [
          {
            exists: {
              field: 'destination.bytes',
            },
          },
        ],
      };
    case FlowDirection.biDirectional:
      return {
        must: [
          {
            exists: {
              field: 'source.bytes',
            },
          },
          {
            exists: {
              field: 'destination.bytes',
            },
          },
        ],
      };
    case FlowDirection.unified:
    default:
      return {};
  }
};

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
  flowDirection,
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
        ...getAllDirectionAggs(networkTopNFlowSort, flowTarget, querySize),
      },
      query: {
        bool: {
          filter,
          ...getDirectionalFilter(flowDirection),
        },
      },
    },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};

const getAllDirectionAggs = (
  networkTopNFlowSortField: NetworkTopNFlowSortField,
  flowTarget: FlowTarget,
  querySize: number
) => ({
  bytes_source: {
    terms: {
      field: 'source.ip',
      size: querySize,
      order: {
        ...getQueryOrder(networkTopNFlowSortField),
      },
    },
    aggs: {
      bytes_in: {
        sum: {
          field: 'destination.bytes',
        },
      },
      bytes_out: {
        sum: {
          field: 'source.bytes',
        },
      },
    },
  },
  bytes_destination: {
    terms: {
      field: 'destination.ip',
      size: querySize,
      order: {
        ...getQueryOrder(networkTopNFlowSortField),
      },
    },
    aggs: {
      bytes_in: {
        sum: {
          field: 'source.bytes',
        },
      },
      bytes_out: {
        sum: {
          field: 'destination.bytes',
        },
      },
    },
  },
});

type QueryOrder = { bytes_in: Direction } | { bytes_out: Direction };

const getQueryOrder = (networkTopNFlowSortField: NetworkTopNFlowSortField): QueryOrder => {
  switch (networkTopNFlowSortField.field) {
    case NetworkTopNFlowFields.bytes:
      return { bytes_in: networkTopNFlowSortField.direction };
    case NetworkTopNFlowFields.packets:
      return { bytes_out: networkTopNFlowSortField.direction };
  }
};


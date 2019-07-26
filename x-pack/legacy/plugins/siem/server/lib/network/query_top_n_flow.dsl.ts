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
import { assertUnreachable, createQueryFilterClauses } from '../../utils/build_query';

import { NetworkTopNFlowRequestOptions } from './index';

const getFlowDirectionFilter = (flowDirection: FlowDirection) => {
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

const getCountAgg = (flowTarget: FlowTarget) => {
  if (flowTarget === FlowTarget.unified) {
    return {
      top_n_flow_unified_count: {
        cardinality: {
          script: {
            lang: 'painless',
            source: `[doc['${FlowTarget.source}.ip'], doc['${FlowTarget.destination}.ip']]`,
          },
        },
      },
    };
  }
  return {
    top_n_flow_count: {
      cardinality: {
        field: `${flowTarget}.ip`,
      },
    },
  };
};

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
        ...getFlowTargetAggs(networkTopNFlowSort, flowTarget, querySize),
      },
      query: {
        bool: {
          filter,
          ...getFlowDirectionFilter(flowDirection),
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
  flowTarget: FlowTarget,
  querySize: number
) => {
  if (flowTarget === FlowTarget.unified) {
    return {
      ...generateFlowTargetAggs(networkTopNFlowSortField, FlowTarget.source, querySize),
      ...generateFlowTargetAggs(networkTopNFlowSortField, FlowTarget.destination, querySize),
    };
  }
  return generateFlowTargetAggs(networkTopNFlowSortField, flowTarget, querySize);
};

const getOppositeField = (flowTarget: FlowTarget.source | FlowTarget.destination): FlowTarget => {
  switch (flowTarget) {
    case FlowTarget.source:
      return FlowTarget.destination;
    case FlowTarget.destination:
      return FlowTarget.source;
  }
  assertUnreachable(flowTarget);
};

type QueryOrder = { bytes_in: Direction } | { bytes_out: Direction };

const getQueryOrder = (networkTopNFlowSortField: NetworkTopNFlowSortField): QueryOrder => {
  switch (networkTopNFlowSortField.field) {
    case NetworkTopNFlowFields.bytes_in:
      return { bytes_in: networkTopNFlowSortField.direction };
    case NetworkTopNFlowFields.bytes_out:
      return { bytes_out: networkTopNFlowSortField.direction };
  }
  assertUnreachable(networkTopNFlowSortField.field);
};

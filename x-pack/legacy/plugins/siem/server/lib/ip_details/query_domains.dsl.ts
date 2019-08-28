/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  DomainsFields,
  DomainsSortField,
  FlowDirection,
  FlowTarget,
} from '../../graphql/types';
import { assertUnreachable, createQueryFilterClauses } from '../../utils/build_query';

import { DomainsRequestOptions } from './index';

const getAggs = (
  ip: string,
  flowTarget: FlowTarget,
  flowDirection: FlowDirection,
  domainsSortField: DomainsSortField,
  querySize: number
) => {
  return {
    domain_count: {
      cardinality: {
        field: `${flowTarget}.domain`,
      },
    },
    [`${flowTarget}_domains`]: {
      terms: {
        field: `${flowTarget}.domain`,
        size: querySize,
        order: {
          ...getQueryOrder(domainsSortField),
        },
      },
      aggs: {
        lastSeen: {
          max: {
            field: '@timestamp',
          },
        },
        bytes: {
          sum: {
            field:
              flowDirection === FlowDirection.uniDirectional
                ? 'network.bytes'
                : `${flowTarget}.bytes`,
          },
        },
        direction: {
          terms: {
            field: 'network.direction',
          },
        },
        uniqueIpCount: {
          cardinality: {
            field: `${getOppositeField(flowTarget)}.ip`,
          },
        },
        packets: {
          sum: {
            field:
              flowDirection === FlowDirection.uniDirectional
                ? 'network.packets'
                : `${flowTarget}.packets`,
          },
        },
      },
    },
  };
};

const getUniDirectionalFilter = (flowDirection: FlowDirection) =>
  flowDirection === FlowDirection.uniDirectional
    ? {
        must_not: [
          {
            exists: {
              field: 'destination.bytes',
            },
          },
        ],
      }
    : {};

const getBiDirectionalFilter = (flowDirection: FlowDirection, flowTarget: FlowTarget) => {
  if (
    flowDirection === FlowDirection.biDirectional &&
    [FlowTarget.source, FlowTarget.destination].includes(flowTarget)
  ) {
    return [
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
    ];
  } else if (
    flowDirection === FlowDirection.biDirectional &&
    [FlowTarget.client, FlowTarget.server].includes(flowTarget)
  ) {
    return [
      {
        exists: {
          field: 'client.bytes',
        },
      },
      {
        exists: {
          field: 'server.bytes',
        },
      },
    ];
  }
  return [];
};

export const buildDomainsQuery = ({
  ip,
  domainsSortField,
  filterQuery,
  flowDirection,
  flowTarget,
  pagination: { querySize },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
  timerange: { from, to },
}: DomainsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    { range: { [timestamp]: { gte: from, lte: to } } },
    { term: { [`${flowTarget}.ip`]: ip } },
    ...getBiDirectionalFilter(flowDirection, flowTarget),
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      aggs: {
        ...getAggs(ip, flowTarget, flowDirection, domainsSortField, querySize),
      },
      query: {
        bool: {
          filter,
          ...getUniDirectionalFilter(flowDirection),
        },
      },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
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
    default:
      return assertUnreachable(flowTarget);
  }
};

type QueryOrder =
  | { _key: Direction }
  | { bytes: Direction }
  | { packets: Direction }
  | { uniqueIpCount: Direction };

const getQueryOrder = (domainsSortField: DomainsSortField): QueryOrder => {
  switch (domainsSortField.field) {
    case DomainsFields.bytes:
      return { bytes: domainsSortField.direction };
    case DomainsFields.packets:
      return { packets: domainsSortField.direction };
    case DomainsFields.uniqueIpCount:
      return { uniqueIpCount: domainsSortField.direction };
    case DomainsFields.domainName:
      return { _key: domainsSortField.direction };
    case DomainsFields.direction:
      return { _key: domainsSortField.direction };
    default:
      return assertUnreachable(domainsSortField.field);
  }
};

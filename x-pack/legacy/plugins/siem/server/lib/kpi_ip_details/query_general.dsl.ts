/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KpiIpDetailsESMSearchBody } from './types';
import { KpiIpDetailsRequestOptions } from './elasticsearch_adapter';

const getAggs = (type: string, ip: string) => {
  return {
    [type]: {
      filter: {
        term: {
          [`${type}.ip`]: ip,
        },
      },
      aggs: {
        hosts: {
          cardinality: {
            field: 'host.name',
          },
        },
        packets: {
          sum: {
            field: `${type}.packets`,
          },
        },
        packetsHistogram: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: '6',
          },
          aggs: {
            count: {
              sum: {
                field: `${type}.packets`,
              },
            },
          },
        },
        bytes: {
          sum: {
            field: `${type}.bytes`,
          },
        },
        bytesHistogram: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: '6',
          },
          aggs: {
            count: {
              sum: {
                field: `${type}.bytes`,
              },
            },
          },
        },
      },
    },
  };
};
export const buildGeneralQuery = ({
  defaultIndex,
  ip,
  timerange: { from, to },
}: KpiIpDetailsRequestOptions): KpiIpDetailsESMSearchBody[] => {
  const dslQuery = [
    {
      allowNoIndices: true,
      index: defaultIndex,
      ignoreUnavailable: true,
    },
    {
      aggs: {
        connections: {
          cardinality: {
            field: 'network.community_id',
          },
        },
        ...getAggs('source', ip),
        ...getAggs('destination', ip),
      },
      query: {
        bool: {
          should: [],
        },
      },
      size: 0,
      track_total_hits: true,
    },
  ];

  return dslQuery;
};

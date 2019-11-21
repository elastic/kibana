/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkTopNFlowData, FlowTargetSourceDest } from '../../../../graphql/types';

export const mockData: { NetworkTopNFlow: NetworkTopNFlowData } = {
  NetworkTopNFlow: {
    totalCount: 524,
    edges: [
      {
        node: {
          source: {
            autonomous_system: {
              name: 'Google, Inc',
              number: 15169,
            },
            domain: ['test.domain.com'],
            flows: 12345,
            destination_ips: 12,
            ip: '8.8.8.8',
            location: {
              geo: {
                continent_name: ['North America'],
                country_name: null,
                country_iso_code: ['US'],
                city_name: ['Mountain View'],
                region_iso_code: ['US-CA'],
                region_name: ['California'],
              },
              flowTarget: FlowTargetSourceDest.source,
            },
          },
          destination: null,
          network: {
            bytes_in: 3826633497,
            bytes_out: 1083495734,
          },
        },
        cursor: {
          value: '8.8.8.8',
        },
      },
      {
        node: {
          source: {
            autonomous_system: {
              name: 'TM Net, Internet Service Provider',
              number: 4788,
            },
            domain: ['test.domain.net', 'test.old.domain.net'],
            flows: 12345,
            destination_ips: 12,
            ip: '9.9.9.9',
            location: {
              geo: {
                continent_name: ['Asia'],
                country_name: null,
                country_iso_code: ['MY'],
                city_name: ['Petaling Jaya'],
                region_iso_code: ['MY-10'],
                region_name: ['Selangor'],
              },
              flowTarget: FlowTargetSourceDest.source,
            },
          },
          destination: null,
          network: {
            bytes_in: 3826633497,
            bytes_out: 1083495734,
          },
        },
        cursor: {
          value: '9.9.9.9',
        },
      },
    ],
    pageInfo: {
      activePage: 1,
      fakeTotalCount: 50,
      showMorePagesIndicator: true,
    },
  },
};

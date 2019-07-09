/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DomainsData } from '../../../../graphql/types';

export const mockDomainsData: DomainsData = {
  totalCount: 2,
  edges: [
    {
      node: {
        source: null,
        destination: {
          uniqueIpCount: 96,
          domainName: 'samsungtv-kitchen.iot.sr.local.example.com',
          firstSeen: null,
          lastSeen: null,
        },
        network: {
          bytes: 1054651765,
          direction: [],
          packets: 707990,
        },
      },
      cursor: {
        value: 'samsungtv-kitchen.iot.sr.local.example.com',
      },
    },
    {
      node: {
        source: null,
        destination: {
          uniqueIpCount: 6,
          domainName: '.row.exmaple.com',
          firstSeen: null,
          lastSeen: null,
        },
        network: {
          bytes: 0,
          direction: [],
          packets: 0,
        },
      },
      cursor: {
        value: 'row.exmaple.com',
      },
    },
    {
      node: {
        source: null,
        destination: {
          uniqueIpCount: 1,
          domainName: '10.10.10.10',
          firstSeen: null,
          lastSeen: null,
        },
        network: {
          bytes: 0,
          direction: [],
          packets: 0,
        },
      },
      cursor: {
        value: '10.10.10.10',
      },
    },
  ],
  pageInfo: {
    endCursor: {
      value: '10',
    },
    hasNextPage: false,
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkDnsData } from '../../../../graphql/types';

export const mockData: { NetworkDns: NetworkDnsData } = {
  NetworkDns: {
    totalCount: 80,
    edges: [
      {
        node: {
          _id: 'nflxvideo.net',
          dnsBytesIn: 2964,
          dnsBytesOut: 12546,
          dnsName: 'nflxvideo.net',
          queryCount: 52,
          uniqueDomains: 21,
        },
        cursor: { value: 'nflxvideo.net' },
      },
      {
        node: {
          _id: 'apple.com',
          dnsBytesIn: 2680,
          dnsBytesOut: 31687,
          dnsName: 'apple.com',
          queryCount: 75,
          uniqueDomains: 20,
        },
        cursor: { value: 'apple.com' },
      },
      {
        node: {
          _id: 'googlevideo.com',
          dnsBytesIn: 1890,
          dnsBytesOut: 16292,
          dnsName: 'googlevideo.com',
          queryCount: 38,
          uniqueDomains: 19,
        },
        cursor: { value: 'googlevideo.com' },
      },
      {
        node: {
          _id: 'netflix.com',
          dnsBytesIn: 60525,
          dnsBytesOut: 218193,
          dnsName: 'netflix.com',
          queryCount: 1532,
          uniqueDomains: 12,
        },
        cursor: { value: 'netflix.com' },
      },
      {
        node: {
          _id: 'samsungcloudsolution.com',
          dnsBytesIn: 1480,
          dnsBytesOut: 11702,
          dnsName: 'samsungcloudsolution.com',
          queryCount: 31,
          uniqueDomains: 8,
        },
        cursor: { value: 'samsungcloudsolution.com' },
      },
      {
        node: {
          _id: 'doubleclick.net',
          dnsBytesIn: 1505,
          dnsBytesOut: 14372,
          dnsName: 'doubleclick.net',
          queryCount: 35,
          uniqueDomains: 7,
        },
        cursor: { value: 'doubleclick.net' },
      },
      {
        node: {
          _id: 'digitalocean.com',
          dnsBytesIn: 2035,
          dnsBytesOut: 4111,
          dnsName: 'digitalocean.com',
          queryCount: 35,
          uniqueDomains: 6,
        },
        cursor: { value: 'digitalocean.com' },
      },
      {
        node: {
          _id: 'samsungelectronics.com',
          dnsBytesIn: 3916,
          dnsBytesOut: 36592,
          dnsName: 'samsungelectronics.com',
          queryCount: 89,
          uniqueDomains: 6,
        },
        cursor: { value: 'samsungelectronics.com' },
      },
      {
        node: {
          _id: 'google.com',
          dnsBytesIn: 896,
          dnsBytesOut: 8072,
          dnsName: 'google.com',
          queryCount: 23,
          uniqueDomains: 5,
        },
        cursor: { value: 'google.com' },
      },
      {
        node: {
          _id: 'samsungcloudsolution.net',
          dnsBytesIn: 1490,
          dnsBytesOut: 11518,
          dnsName: 'samsungcloudsolution.net',
          queryCount: 30,
          uniqueDomains: 5,
        },
        cursor: { value: 'samsungcloudsolution.net' },
      },
    ],
    pageInfo: {
      endCursor: { value: '10' },
      hasNextPage: true,
    },
  },
};

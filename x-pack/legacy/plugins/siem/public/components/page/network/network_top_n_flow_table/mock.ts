/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkTopNFlowData } from '../../../../graphql/types';

export const mockData: { NetworkTopNFlow: NetworkTopNFlowData } = {
  NetworkTopNFlow: {
    totalCount: 524,
    edges: [
      {
        node: {
          source: {
            autonomous_system: 'Google, Inc',
            domain: ['test.domain.com'],
            ip: '8.8.8.8',
            location: 'US',
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
            autonomous_system: 'Google, Inc',
            domain: ['test.domain.net', 'test.old.domain.net'],
            ip: '9.9.9.9',
            location: 'DE',
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostsData } from '../../../../graphql/types';

export const mockData: { Hosts: HostsData } = {
  Hosts: {
    totalCount: 4,
    edges: [
      {
        node: {
          _id: 'cPsuhGcB0WOhS6qyTKC0',
          host: {
            name: ['elrond.elstc.co'],
            os: {
              name: ['Ubuntu'],
              version: ['18.04.1 LTS (Bionic Beaver)'],
            },
          },
        },
        cursor: {
          value: '98966fa2013c396155c460d35c0902be',
        },
      },
      {
        node: {
          _id: 'KwQDiWcB0WOhS6qyXmrW',
          host: {
            name: ['siem-kibana'],
            os: {
              name: ['Debian GNU/Linux'],
              version: ['9 (stretch)'],
            },
          },
          cloud: {
            instance: {
              id: ['423232333829362673777'],
            },
            machine: {
              type: ['custom-4-16384'],
            },
            provider: ['gce'],
            region: ['us-east-1'],
          },
        },
        cursor: {
          value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
        },
      },
    ],
    pageInfo: {
      endCursor: {
        value: 'aa7ca589f1b8220002f2fc61c64cfbf1',
      },
      hasNextPage: true,
    },
  },
};

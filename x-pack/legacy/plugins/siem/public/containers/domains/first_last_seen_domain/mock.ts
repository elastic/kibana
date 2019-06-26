/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FlowTarget, GetDomainFirstLastSeenQuery } from '../../../graphql/types';

import { DomainFirstLastSeenGqlQuery } from './first_last_seen.gql_query';

interface MockFirstLastSeenDomainQuery {
  request: {
    query: GetDomainFirstLastSeenQuery.Query;
    variables: GetDomainFirstLastSeenQuery.Variables;
  };
  result: {
    data?: {
      source: {
        id: string;
        DomainFirstLastSeen: {
          firstSeen: string | null;
          lastSeen: string | null;
        };
      };
    };
    errors?: [{ message: string }];
  };
}

export const mockFirstLastSeenDomainQuery: MockFirstLastSeenDomainQuery[] = [
  {
    request: {
      query: DomainFirstLastSeenGqlQuery,
      variables: {
        sourceId: 'default',
        ip: '10.10.10.10',
        domainName: 'example.com',
        flowTarget: FlowTarget.source,
        defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      },
    },
    result: {
      data: {
        source: {
          id: 'default',
          DomainFirstLastSeen: {
            firstSeen: '2019-04-08T16:09:40.692Z',
            lastSeen: '2019-04-08T18:35:45.064Z',
          },
        },
      },
    },
  },
];

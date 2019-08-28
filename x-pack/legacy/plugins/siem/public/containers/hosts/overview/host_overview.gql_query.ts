/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const HostOverviewQuery = gql`
  query GetHostOverviewQuery(
    $sourceId: ID!
    $hostName: String!
    $timerange: TimerangeInput!
    $defaultIndex: [String!]!
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      HostOverview(hostName: $hostName, timerange: $timerange, defaultIndex: $defaultIndex) {
        _id
        host {
          architecture
          id
          ip
          mac
          name
          os {
            family
            name
            platform
            version
          }
          type
        }
        cloud {
          instance {
            id
          }
          machine {
            type
          }
          provider
          region
        }
        inspect @include(if: $inspect) {
          dsl
          response
        }
      }
    }
  }
`;

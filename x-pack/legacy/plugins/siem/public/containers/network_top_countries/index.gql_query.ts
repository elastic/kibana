/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const networkTopCountriesQuery = gql`
  query GetNetworkTopCountriesQuery(
    $sourceId: ID!
    $ip: String
    $filterQuery: String
    $pagination: PaginationInputPaginated!
    $sort: NetworkTopTablesSortField!
    $flowTarget: FlowTargetSourceDest!
    $timerange: TimerangeInput!
    $defaultIndex: [String!]!
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      NetworkTopCountries(
        filterQuery: $filterQuery
        flowTarget: $flowTarget
        ip: $ip
        pagination: $pagination
        sort: $sort
        timerange: $timerange
        defaultIndex: $defaultIndex
      ) {
        totalCount
        edges {
          node {
            source {
              country
              destination_ips
              flows
              source_ips
            }
            destination {
              country
              destination_ips
              flows
              source_ips
            }
            network {
              bytes_in
              bytes_out
            }
          }
          cursor {
            value
          }
        }
        pageInfo {
          activePage
          fakeTotalCount
          showMorePagesIndicator
        }
        inspect @include(if: $inspect) {
          dsl
          response
        }
      }
    }
  }
`;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const networkTopCountriesQuery = gql`
  query GetNetworkTopCountriesQuery(
    $sourceId: ID!
    $filterQuery: String
    $pagination: PaginationInputPaginated!
    $sort: NetworkTopNFlowSortField!
    $flowTarget: FlowTargetNew!
    $timerange: TimerangeInput!
    $defaultIndex: [String!]!
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      NetworkTopCountries(
        filterQuery: $filterQuery
        flowTarget: $flowTarget
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
              flows
              destination_ips
            }
            destination {
              country
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

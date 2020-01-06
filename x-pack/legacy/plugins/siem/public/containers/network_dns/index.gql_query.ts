/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const networkDnsQuery = gql`
  query GetNetworkDnsQuery(
    $sourceId: ID!
    $sort: NetworkDnsSortField!
    $isPtrIncluded: Boolean!
    $timerange: TimerangeInput!
    $pagination: PaginationInputPaginated!
    $filterQuery: String
    $defaultIndex: [String!]!
    $inspect: Boolean!
    $isHistogram: Boolean!
  ) {
    source(id: $sourceId) {
      id
      NetworkDns(
        isPtrIncluded: $isPtrIncluded
        sort: $sort
        timerange: $timerange
        pagination: $pagination
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
      ) {
        totalCount
        edges @skip(if: $isHistogram) {
          node {
            _id
            dnsBytesIn
            dnsBytesOut
            dnsName
            queryCount
            uniqueDomains
          }
          cursor {
            value
          }
        }
        pageInfo @skip(if: $isHistogram) {
          activePage
          fakeTotalCount
          showMorePagesIndicator
        }
        inspect @include(if: $inspect) {
          dsl
          response
        }
        histogram @include(if: $isHistogram) {
          x
          y
          g
        }
      }
    }
  }
`;

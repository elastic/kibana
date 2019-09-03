/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const domainsQuery = gql`
  query GetDomainsQuery(
    $sourceId: ID!
    $filterQuery: String
    $flowDirection: FlowDirection!
    $flowTarget: FlowTarget!
    $ip: String!
    $pagination: PaginationInputPaginated!
    $sort: DomainsSortField!
    $timerange: TimerangeInput!
    $defaultIndex: [String!]!
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      Domains(
        filterQuery: $filterQuery
        flowDirection: $flowDirection
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
              uniqueIpCount
              domainName
              firstSeen
              lastSeen
            }
            destination {
              uniqueIpCount
              domainName
              firstSeen
              lastSeen
            }
            network {
              bytes
              direction
              packets
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

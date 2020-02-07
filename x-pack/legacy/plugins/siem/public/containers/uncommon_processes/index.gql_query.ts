/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const uncommonProcessesQuery = gql`
  query GetUncommonProcessesQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $pagination: PaginationInputPaginated!
    $filterQuery: String
    $defaultIndex: [String!]!
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      UncommonProcesses(
        timerange: $timerange
        pagination: $pagination
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
      ) {
        totalCount
        edges {
          node {
            _id
            instances
            process {
              args
              name
            }
            user {
              id
              name
            }
            hosts {
              name
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

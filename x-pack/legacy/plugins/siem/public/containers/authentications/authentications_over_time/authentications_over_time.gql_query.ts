/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const AuthenticationsOverTimeGqlQuery = gql`
  query GetAuthenticationsOverTimeQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $defaultIndex: [String!]!
    $filterQuery: String
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      AuthenticationsOverTime(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
      ) {
        authenticationsOverTime {
          x
          y
          g
        }
        totalCount
        inspect @include(if: $inspect) {
          dsl
          response
        }
      }
    }
  }
`;

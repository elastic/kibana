/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const AnomaliesOverTimeGqlQuery = gql`
  query GetAnomaliesOverTimeQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $defaultIndex: [String!]!
    $filterQuery: String
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      AnomaliesOverTime(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
      ) {
        anomaliesOverTime {
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

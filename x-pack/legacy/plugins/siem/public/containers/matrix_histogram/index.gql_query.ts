/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const MatrixHistogramGqlQuery = gql`
  query GetMatrixHistogramQuery(
    $isAlertsHistogram: Boolean!
    $isAnomaliesHistogram: Boolean!
    $isAuthenticationsHistogram: Boolean!
    $isDnsHistogram: Boolean!
    $defaultIndex: [String!]!
    $isEventsHistogram: Boolean!
    $filterQuery: String
    $inspect: Boolean!
    $sourceId: ID!
    $stackByField: String
    $timerange: TimerangeInput!
  ) {
    source(id: $sourceId) {
      id
      AlertsHistogram(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
        stackByField: $stackByField
      ) @include(if: $isAlertsHistogram) {
        matrixHistogramData {
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
      AnomaliesHistogram(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
        stackByField: $stackByField
      ) @include(if: $isAnomaliesHistogram) {
        matrixHistogramData {
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
      AuthenticationsHistogram(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
        stackByField: $stackByField
      ) @include(if: $isAuthenticationsHistogram) {
        matrixHistogramData {
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
      EventsHistogram(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
        stackByField: $stackByField
      ) @include(if: $isEventsHistogram) {
        matrixHistogramData {
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
      NetworkDnsHistogram(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
        stackByField: $stackByField
      ) @include(if: $isDnsHistogram) {
        matrixHistogramData {
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

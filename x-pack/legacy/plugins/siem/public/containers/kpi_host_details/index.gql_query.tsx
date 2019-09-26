/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiHostDetailsQuery = gql`
  fragment KpiHostDetailsChartFields on KpiHostHistogramData {
    x
    y
  }

  query GetKpiHostDetailsQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $filterQuery: String
    $defaultIndex: [String!]!
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      KpiHostDetails(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
      ) {
        authSuccess
        authSuccessHistogram {
          ...KpiHostDetailsChartFields
        }
        authFailure
        authFailureHistogram {
          ...KpiHostDetailsChartFields
        }
        uniqueSourceIps
        uniqueSourceIpsHistogram {
          ...KpiHostDetailsChartFields
        }
        uniqueDestinationIps
        uniqueDestinationIpsHistogram {
          ...KpiHostDetailsChartFields
        }
        inspect @include(if: $inspect) {
          dsl
          response
        }
      }
    }
  }
`;

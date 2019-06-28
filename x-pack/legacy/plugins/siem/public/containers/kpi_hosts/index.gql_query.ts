/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiHostsQuery = gql`
  fragment KpiHostChartFields on KpiHostHistogramData {
    x
    y
  }

  query GetKpiHostsQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $filterQuery: String
    $defaultIndex: [String!]!
  ) {
    source(id: $sourceId) {
      id
      KpiHosts(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
        hosts
        hostsHistogram {
          ...KpiHostChartFields
        }
        authSuccess
        authSuccessHistogram {
          ...KpiHostChartFields
        }
        authFailure
        authFailureHistogram {
          ...KpiHostChartFields
        }
        uniqueSourceIps
        uniqueSourceIpsHistogram {
          ...KpiHostChartFields
        }
        uniqueDestinationIps
        uniqueDestinationIpsHistogram {
          ...KpiHostChartFields
        }
      }
    }
  }
`;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiNetworkQuery = gql`
  fragment KpiNetworkChartFields on KpiNetworkHistogramData {
    x
    y
  }

  query GetKpiNetworkQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $filterQuery: String
    $defaultIndex: [String!]!
  ) {
    source(id: $sourceId) {
      id
      KpiNetwork(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
        networkEvents
        uniqueFlowId
        uniqueSourcePrivateIps
        uniqueSourcePrivateIpsHistogram {
          ...KpiNetworkChartFields
        }
        uniqueDestinationPrivateIps
        uniqueDestinationPrivateIpsHistogram {
          ...KpiNetworkChartFields
        }
        dnsQueries
        tlsHandshakes
      }
    }
  }
`;

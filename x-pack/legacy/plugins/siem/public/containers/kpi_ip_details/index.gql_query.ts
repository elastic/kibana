/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const kpiIpDetailsQuery = gql`
  query GetKpiIpDetailsQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $filterQuery: String
    $defaultIndex: [String!]!
  ) {
    source(id: $sourceId) {
      id
      KpiIpDetails(timerange: $timerange, filterQuery: $filterQuery, defaultIndex: $defaultIndex) {
        sourceByte
        destinationByte
        topSourceIp
        topDestinationIp
        topSourceIpTransportBytes
        topDestinationIpTransportBytes
        topDestinationPort
        topTransport
      }
    }
  }
`;

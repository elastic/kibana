/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const metricsQuery = gql`
  query MetricsQuery(
    $sourceId: ID!
    $timerange: InfraTimerangeInput!
    $metrics: [InfraMetric!]!
    $nodeId: ID!
    $cloudId: ID
    $nodeType: InfraNodeType!
  ) {
    source(id: $sourceId) {
      id
      metrics(
        nodeIds: { nodeId: $nodeId, cloudId: $cloudId }
        timerange: $timerange
        metrics: $metrics
        nodeType: $nodeType
      ) {
        id
        series {
          id
          label
          data {
            timestamp
            value
          }
        }
      }
    }
  }
`;

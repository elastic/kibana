/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const waffleNodesQuery = gql`
  query WaffleNodesQuery(
    $sourceId: ID!
    $timerange: InfraTimerangeInput!
    $filterQuery: String
    $metric: InfraSnapshotMetricInput!
    $groupBy: [InfraSnapshotGroupbyInput!]!
    $type: InfraNodeType!
  ) {
    source(id: $sourceId) {
      id
      snapshot(timerange: $timerange, filterQuery: $filterQuery) {
        nodes(groupBy: $groupBy, metric: $metric, type: $type) {
          path {
            value
            label
            ip
          }
          metric {
            name
            value
            avg
            max
          }
        }
      }
    }
  }
`;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const snapshotSchema: any = gql`
  type InfraSnapshotNodeMetric {
    name: InfraSnapshotMetricType!
    value: Float
    avg: Float
    max: Float
  }

  type InfraSnapshotNodePath {
    value: String!
    label: String!
    ip: String
  }

  type InfraSnapshotNode {
    path: [InfraSnapshotNodePath!]!
    metric: InfraSnapshotNodeMetric!
  }

  input InfraTimerangeInput {
    "The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan."
    interval: String!
    "The end of the timerange"
    to: Float!
    "The beginning of the timerange"
    from: Float!
  }

  enum InfraSnapshotMetricType {
    count
    cpu
    load
    memory
    tx
    rx
    logRate
  }

  input InfraSnapshotMetricInput {
    "The type of metric"
    type: InfraSnapshotMetricType!
  }

  input InfraSnapshotGroupbyInput {
    "The label to use in the results for the group by for the terms group by"
    label: String
    "The field to group by from a terms aggregation, this is ignored by the filter type"
    field: String
  }

  type InfraSnapshotResponse {
    "Nodes of type host, container or pod grouped by 0, 1 or 2 terms"
    nodes(
      type: InfraNodeType!
      groupBy: [InfraSnapshotGroupbyInput!]!
      metric: InfraSnapshotMetricInput!
    ): [InfraSnapshotNode!]!
  }

  extend type InfraSource {
    "A snapshot of nodes"
    snapshot(timerange: InfraTimerangeInput!, filterQuery: String): InfraSnapshotResponse
  }
`;

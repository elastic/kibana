/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const alertsSchema = gql`
  type AlertsData {
    edges: [TimelineEdges!]!
    totalCount: Float!
    pageInfo: PageInfo!
    inspect: Inspect
  }

  enum AlertsFields {
    hostName
  }

  type AlertsOverTimeData {
    inspect: Inspect
    alertsOverTimeByModule: [MatrixOverTimeHistogramData!]!
    totalCount: Float!
  }

  extend type Source {
    Alerts(
      pagination: PaginationInput!
      sortField: SortField!
      fieldRequested: [String!]!
      timerange: TimerangeInput
      filterQuery: String
      defaultIndex: [String!]!
    ): AlertsData!
    AlertsHistogram(
      filterQuery: String
      defaultIndex: [String!]!
      timerange: TimerangeInput!
    ): AlertsOverTimeData!
  }
`;

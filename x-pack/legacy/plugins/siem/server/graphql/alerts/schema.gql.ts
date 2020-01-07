/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const alertsSchema = gql`
  type AlertsOverTimeData {
    inspect: Inspect
    AlertsOverTimeByModule: [MatrixOverTimeHistogramData!]!
    totalCount: Float!
  }

  extend type Source {
    AlertsHistogram(
      filterQuery: String
      defaultIndex: [String!]!
      timerange: TimerangeInput!
      stackByField: String
    ): AlertsOverTimeData!
  }
`;

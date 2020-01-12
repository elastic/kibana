/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const anomaliesSchema = gql`
  type AnomaliesOverTimeData {
    inspect: Inspect
    matrixHistogramData: [MatrixOverTimeHistogramData!]!
    totalCount: Float!
  }

  extend type Source {
    AnomaliesHistogram(
      timerange: TimerangeInput!
      filterQuery: String
      defaultIndex: [String!]!
      stackByField: String
    ): AnomaliesOverTimeData!
  }
`;

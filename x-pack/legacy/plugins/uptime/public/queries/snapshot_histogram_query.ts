/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const snapshotHistogramQueryString = `
  query SnapshotHistogram(
    $dateRangeStart: String!
    $dateRangeEnd: String!
    $filters: String
    $monitorId: String
    $statusFilter: String
  ) {
    histogram: getSnapshotHistogram(
      dateRangeStart: $dateRangeStart
      dateRangeEnd: $dateRangeEnd
      filters: $filters
      statusFilter: $statusFilter
      monitorId: $monitorId
    ) {
      upCount
        downCount
        x
        x0
        y
    }
  }
`;

export const snapshotHistogramQuery = gql`
  ${snapshotHistogramQueryString}
`;

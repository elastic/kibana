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
    queryResult: getSnapshotHistogram(
      dateRangeStart: $dateRangeStart
      dateRangeEnd: $dateRangeEnd
      filters: $filters
      statusFilter: $statusFilter
      monitorId: $monitorId
    ) {
      histogram {
      upCount
        downCount
        x
        x0
        y
      }
      interval
    }
  }
`;

export const snapshotHistogramQuery = gql`
  ${snapshotHistogramQueryString}
`;

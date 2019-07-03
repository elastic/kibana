/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const docCountQueryString = `
query GetStateIndexStatus(
  $dateRangeStart: String!
  $dateRangeEnd: String!
  $filters: String
) {
  statesIndexStatus: getStatesIndexStatus(
    dateRangeStart: $dateRangeStart
    dateRangeEnd: $dateRangeEnd
    filters: $filters
  ) {
    docCount {
      count
    }
    indexExists
  }
}
`;

export const docCountQuery = gql`
  ${docCountQueryString}
`;

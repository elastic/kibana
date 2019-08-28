/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const errorListQueryString = `
query ErrorList($dateRangeStart: String!, $dateRangeEnd: String!, $filters: String) {
  errorList: getErrorsList(
    dateRangeStart: $dateRangeStart
    dateRangeEnd: $dateRangeEnd
    filters: $filters
  ) {
    count
    latestMessage
    location
    monitorId
    name
    statusCode
    timestamp
    type
  }
}
`;

export const errorListQuery = gql`
  ${errorListQueryString}
`;

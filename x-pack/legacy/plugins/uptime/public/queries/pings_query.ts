/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const pingsQueryString = `
query PingList(
  $dateRangeStart: String!
  $dateRangeEnd: String!
  $monitorId: String
  $status: String
  $sort: String
  $size: Int
  $location: String
) {
  allPings(
    dateRangeStart: $dateRangeStart
    dateRangeEnd: $dateRangeEnd
    monitorId: $monitorId
    status: $status
    sort: $sort
    size: $size
    location: $location
  ) {
      total
      locations
      pings {
        id
        timestamp
        http {
          response {
            status_code 
            body {
              bytes
              hash
              content
              content_bytes
            }
          }
        }
        error {
          message
          type
        }
        monitor {
          duration {
            us
          }
          id
          ip
          name
          scheme
          status
          type
        }
        observer {
          geo {
            name
          }
        }
      }
    }
  }
`;

export const pingsQuery = gql`
  ${pingsQueryString}
`;

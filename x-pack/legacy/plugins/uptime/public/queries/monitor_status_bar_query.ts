/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const monitorStatusBarQueryString = `
query MonitorStatus($dateRangeStart: String!, $dateRangeEnd: String!, $monitorId: String, $location: String) {
  monitorStatus: getLatestMonitors(
    dateRangeStart: $dateRangeStart
    dateRangeEnd: $dateRangeEnd
    monitorId: $monitorId
    location: $location
  ) {
    timestamp
    monitor {
      status
      duration {
        us
      }
    }
    observer {
      geo {
        name
      }
    }
    tls {
      certificate_not_valid_after
    }
    url {
      full
    }
  }
}
`;

export const monitorStatusBarQuery = gql`
  ${monitorStatusBarQueryString}
`;

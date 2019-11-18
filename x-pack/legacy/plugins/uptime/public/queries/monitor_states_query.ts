/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const monitorStatesQueryString = `
query MonitorStates($dateRangeStart: String!, $dateRangeEnd: String!, $pagination: String, $filters: String, $statusFilter: String) {
  monitorStates: getMonitorStates(
    dateRangeStart: $dateRangeStart
    dateRangeEnd: $dateRangeEnd
    pagination: $pagination
    filters: $filters
    statusFilter: $statusFilter
  ) {
    prevPagePagination
    nextPagePagination
    totalSummaryCount {
      count
    }
    summaries {
      monitor_id
      histogram {
        count
        points {
          timestamp
          up
          down
        }
      }
      state {
        agent {
          id
        }
        checks {
          agent {
            id
          }
          container {
            id
          }
          kubernetes {
            pod {
              uid
            }
          }
          monitor {
            ip
            name
            status
          }
          observer {
            geo {
              name
              location {
                lat
                lon
              }
            }
          }
          timestamp
        }
        geo {
          name
          location {
            lat
            lon
          }
        }
        observer {
          geo {
            name
            location {
              lat
              lon
            }
          }
        }
        monitor {
          id
          name
          status
          type
        }
        summary {
          up
          down
          geo {
            name
            location {
              lat
              lon
            }
          }
        }
        url {
          full
          domain
        }
        timestamp
      }
    }
  }
}
`;

export const monitorStatesQuery = gql`
  ${monitorStatesQueryString}
`;

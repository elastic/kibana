/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const eventsQuery = gql`
  query GetEventsQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $pagination: PaginationInput!
    $sortField: SortField!
    $filterQuery: String
    $defaultIndex: [String!]!
  ) {
    source(id: $sourceId) {
      id
      Events(
        timerange: $timerange
        pagination: $pagination
        sortField: $sortField
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
      ) {
        totalCount
        pageInfo {
          endCursor {
            value
            tiebreaker
          }
          hasNextPage
        }
        edges {
          node {
            _id
            _index
            timestamp
            event {
              action
              category
              dataset
              id
              module
              severity
            }
            host {
              name
              ip
              id
            }
            message
            source {
              ip
              port
            }
            destination {
              ip
              port
            }
            suricata {
              eve {
                proto
                flow_id
                alert {
                  signature
                  signature_id
                }
              }
            }
            user {
              name
            }
            zeek {
              session_id
            }
          }
        }
      }
    }
  }
`;

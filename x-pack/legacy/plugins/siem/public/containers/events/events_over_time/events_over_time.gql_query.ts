/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const EventsOverTimeGqlQuery = gql`
  query GetEventsOverTimeQuery(
    $sourceId: ID!
    $timerange: TimerangeInput!
    $defaultIndex: [String!]!
    $filterQuery: String
    $inspect: Boolean!
  ) {
    source(id: $sourceId) {
      id
      EventsOverTime(
        timerange: $timerange
        filterQuery: $filterQuery
        defaultIndex: $defaultIndex
      ) {
        eventsOverTime {
          x
          y
        }
        totalCount
        inspect @include(if: $inspect) {
          dsl
          response
        }
      }
    }
  }
`;

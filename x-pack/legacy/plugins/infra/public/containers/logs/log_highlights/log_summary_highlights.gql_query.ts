/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

import { sharedFragments } from '../../../../common/graphql/shared';

export const logSummaryHighlightsQuery = gql`
  query LogSummaryHighlightsQuery(
    $sourceId: ID = "default"
    $start: Float!
    $end: Float!
    $bucketSize: Float!
    $highlightQueries: [String!]!
    $filterQuery: String
  ) {
    source(id: $sourceId) {
      id
      logSummaryHighlightsBetween(
        start: $start
        end: $end
        bucketSize: $bucketSize
        highlightQueries: $highlightQueries
        filterQuery: $filterQuery
      ) {
        start
        end
        buckets {
          start
          end
          entriesCount
          representativeKey {
            ...InfraTimeKeyFields
          }
        }
      }
    }
  }

  ${sharedFragments.InfraTimeKey}
`;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

import { sharedFragments } from '../../../../../common/graphql/shared';

export const logEntriesQuery = gql`
  query LogEntries(
    $sourceId: ID = "default"
    $timeKey: InfraTimeKeyInput!
    $countBefore: Int = 0
    $countAfter: Int = 0
    $filterQuery: String
  ) {
    source(id: $sourceId) {
      id
      logEntriesAround(
        key: $timeKey
        countBefore: $countBefore
        countAfter: $countAfter
        filterQuery: $filterQuery
      ) {
        start {
          ...InfraTimeKeyFields
        }
        end {
          ...InfraTimeKeyFields
        }
        hasMoreBefore
        hasMoreAfter
        entries {
          ...InfraLogEntryFields
        }
      }
    }
  }

  ${sharedFragments.InfraTimeKey}
  ${sharedFragments.InfraLogEntryFields}
`;

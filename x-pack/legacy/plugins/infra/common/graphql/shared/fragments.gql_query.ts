/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const sharedFragments = {
  InfraTimeKey: gql`
    fragment InfraTimeKeyFields on InfraTimeKey {
      time
      tiebreaker
    }
  `,
  InfraSourceFields: gql`
    fragment InfraSourceFields on InfraSource {
      id
      version
      updatedAt
      origin
    }
  `,
  InfraLogEntryFields: gql`
    fragment InfraLogEntryFields on InfraLogEntry {
      gid
      key {
        time
        tiebreaker
      }
      columns {
        ... on InfraLogEntryTimestampColumn {
          columnId
          timestamp
        }
        ... on InfraLogEntryMessageColumn {
          columnId
          message {
            ... on InfraLogMessageFieldSegment {
              field
              value
            }
            ... on InfraLogMessageConstantSegment {
              constant
            }
          }
        }
        ... on InfraLogEntryFieldColumn {
          columnId
          field
          value
        }
      }
    }
  `,
  InfraLogEntryHighlightFields: gql`
    fragment InfraLogEntryHighlightFields on InfraLogEntry {
      gid
      key {
        time
        tiebreaker
      }
      columns {
        ... on InfraLogEntryMessageColumn {
          columnId
          message {
            ... on InfraLogMessageFieldSegment {
              field
              highlights
            }
          }
        }
        ... on InfraLogEntryFieldColumn {
          columnId
          field
          highlights
        }
      }
    }
  `,
};

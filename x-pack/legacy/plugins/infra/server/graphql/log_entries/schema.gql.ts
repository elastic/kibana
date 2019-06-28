/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const logEntriesSchema = gql`
  "A segment of the log entry message that was derived from a field"
  type InfraLogMessageFieldSegment {
    "The field the segment was derived from"
    field: String!
    "The segment's message"
    value: String!
    "A list of highlighted substrings of the value"
    highlights: [String!]!
  }

  "A segment of the log entry message that was derived from a string literal"
  type InfraLogMessageConstantSegment {
    "The segment's message"
    constant: String!
  }

  "A segment of the log entry message"
  union InfraLogMessageSegment = InfraLogMessageFieldSegment | InfraLogMessageConstantSegment

  "A special built-in column that contains the log entry's timestamp"
  type InfraLogEntryTimestampColumn {
    "The timestamp"
    timestamp: Float!
  }

  "A special built-in column that contains the log entry's constructed message"
  type InfraLogEntryMessageColumn {
    "A list of the formatted log entry segments"
    message: [InfraLogMessageSegment!]!
  }

  "A column that contains the value of a field of the log entry"
  type InfraLogEntryFieldColumn {
    "The field name of the column"
    field: String!
    "The value of the field in the log entry"
    value: String!
  }

  "A column of a log entry"
  union InfraLogEntryColumn =
      InfraLogEntryTimestampColumn
    | InfraLogEntryMessageColumn
    | InfraLogEntryFieldColumn

  "A log entry"
  type InfraLogEntry {
    "A unique representation of the log entry's position in the event stream"
    key: InfraTimeKey!
    "The log entry's id"
    gid: String!
    "The source id"
    source: String!
    "The columns used for rendering the log entry"
    columns: [InfraLogEntryColumn!]!
  }

  "A log summary bucket"
  type InfraLogSummaryBucket {
    "The start timestamp of the bucket"
    start: Float!
    "The end timestamp of the bucket"
    end: Float!
    "The number of entries inside the bucket"
    entriesCount: Int!
  }

  "A consecutive sequence of log entries"
  type InfraLogEntryInterval {
    "The key corresponding to the start of the interval covered by the entries"
    start: InfraTimeKey
    "The key corresponding to the end of the interval covered by the entries"
    end: InfraTimeKey
    "Whether there are more log entries available before the start"
    hasMoreBefore: Boolean!
    "Whether there are more log entries available after the end"
    hasMoreAfter: Boolean!
    "The query the log entries were filtered by"
    filterQuery: String
    "The query the log entries were highlighted with"
    highlightQuery: String
    "A list of the log entries"
    entries: [InfraLogEntry!]!
  }

  "A consecutive sequence of log summary buckets"
  type InfraLogSummaryInterval {
    "The millisecond timestamp corresponding to the start of the interval covered by the summary"
    start: Float
    "The millisecond timestamp corresponding to the end of the interval covered by the summary"
    end: Float
    "The query the log entries were filtered by"
    filterQuery: String
    "A list of the log entries"
    buckets: [InfraLogSummaryBucket!]!
  }

  type InfraLogItemField {
    "The flattened field name"
    field: String!
    "The value for the Field as a string"
    value: String!
  }

  type InfraLogItem {
    "The ID of the document"
    id: ID!
    "The index where the document was found"
    index: String!
    "Time key for the document - derived from the source configuration timestamp and tiebreaker settings"
    key: InfraTimeKey!
    "An array of flattened fields and values"
    fields: [InfraLogItemField!]!
  }

  extend type InfraSource {
    "A consecutive span of log entries surrounding a point in time"
    logEntriesAround(
      "The sort key that corresponds to the point in time"
      key: InfraTimeKeyInput!
      "The maximum number of preceding to return"
      countBefore: Int = 0
      "The maximum number of following to return"
      countAfter: Int = 0
      "The query to filter the log entries by"
      filterQuery: String
      "The query to highlight the log entries with"
      highlightQuery: String
    ): InfraLogEntryInterval!
    "A consecutive span of log entries within an interval"
    logEntriesBetween(
      "The sort key that corresponds to the start of the interval"
      startKey: InfraTimeKeyInput!
      "The sort key that corresponds to the end of the interval"
      endKey: InfraTimeKeyInput!
      "The query to filter the log entries by"
      filterQuery: String
      "The query to highlight the log entries with"
      highlightQuery: String
    ): InfraLogEntryInterval!
    "A consecutive span of summary buckets within an interval"
    logSummaryBetween(
      "The millisecond timestamp that corresponds to the start of the interval"
      start: Float!
      "The millisecond timestamp that corresponds to the end of the interval"
      end: Float!
      "The size of each bucket in milliseconds"
      bucketSize: Float!
      "The query to filter the log entries by"
      filterQuery: String
    ): InfraLogSummaryInterval!
    logItem(id: ID!): InfraLogItem!
  }
`;

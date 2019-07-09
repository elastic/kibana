/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bisector } from 'd3-array';

import { compareToTimeKey, getIndexAtTimeKey, TimeKey } from '../../../common/time';
import { InfraLogEntryFields } from '../../graphql/types';

export type LogEntry = InfraLogEntryFields.Fragment;

export type LogEntryColumn = InfraLogEntryFields.Columns;
export type LogEntryMessageColumn = InfraLogEntryFields.InfraLogEntryMessageColumnInlineFragment;
export type LogEntryTimestampColumn = InfraLogEntryFields.InfraLogEntryTimestampColumnInlineFragment;
export type LogEntryFieldColumn = InfraLogEntryFields.InfraLogEntryFieldColumnInlineFragment;

export type LogEntryMessageSegment = InfraLogEntryFields.Message;
export type LogEntryConstantMessageSegment = InfraLogEntryFields.InfraLogMessageConstantSegmentInlineFragment;
export type LogEntryFieldMessageSegment = InfraLogEntryFields.InfraLogMessageFieldSegmentInlineFragment;

export const getLogEntryKey = (entry: LogEntry) => entry.key;

const logEntryTimeBisector = bisector(compareToTimeKey(getLogEntryKey));

export const getLogEntryIndexBeforeTime = logEntryTimeBisector.left;
export const getLogEntryIndexAfterTime = logEntryTimeBisector.right;
export const getLogEntryIndexAtTime = getIndexAtTimeKey(getLogEntryKey);

export const getLogEntryAtTime = (entries: LogEntry[], time: TimeKey) => {
  const entryIndex = getLogEntryIndexAtTime(entries, time);

  return entryIndex !== null ? entries[entryIndex] : null;
};

export const isTimestampColumn = (column: LogEntryColumn): column is LogEntryTimestampColumn =>
  column != null && 'timestamp' in column;

export const isMessageColumn = (column: LogEntryColumn): column is LogEntryMessageColumn =>
  column != null && 'message' in column;

export const isFieldColumn = (column: LogEntryColumn): column is LogEntryFieldColumn =>
  column != null && 'field' in column;

export const isConstantSegment = (
  segment: LogEntryMessageSegment
): segment is LogEntryConstantMessageSegment => 'constant' in segment;

export const isFieldSegment = (
  segment: LogEntryMessageSegment
): segment is LogEntryFieldMessageSegment => 'field' in segment && 'value' in segment;

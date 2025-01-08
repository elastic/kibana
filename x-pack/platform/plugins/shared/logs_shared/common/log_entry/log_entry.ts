/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeKey } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { jsonArrayRT } from '../typed_json';
import { logEntryCursorRT } from './log_entry_cursor';

export type LogEntryTime = TimeKey;

/**
 * message parts
 */
export const logMessageConstantPartRT = rt.type({
  constant: rt.string,
});
export type LogMessageConstantPart = rt.TypeOf<typeof logMessageConstantPartRT>;

export const logMessageFieldPartRT = rt.type({
  field: rt.string,
  value: jsonArrayRT,
  highlights: rt.array(rt.string),
});
export type LogMessageFieldPart = rt.TypeOf<typeof logMessageFieldPartRT>;

export const logMessagePartRT = rt.union([logMessageConstantPartRT, logMessageFieldPartRT]);
export type LogMessagePart = rt.TypeOf<typeof logMessagePartRT>;

/**
 * columns
 */

export const logTimestampColumnRT = rt.type({ columnId: rt.string, time: rt.string });
export type LogTimestampColumn = rt.TypeOf<typeof logTimestampColumnRT>;

export const logFieldColumnRT = rt.type({
  columnId: rt.string,
  field: rt.string,
  value: jsonArrayRT,
  highlights: rt.array(rt.string),
});
export type LogFieldColumn = rt.TypeOf<typeof logFieldColumnRT>;

export const logMessageColumnRT = rt.type({
  columnId: rt.string,
  message: rt.array(logMessagePartRT),
});
export type LogMessageColumn = rt.TypeOf<typeof logMessageColumnRT>;

export const logColumnRT = rt.union([logTimestampColumnRT, logFieldColumnRT, logMessageColumnRT]);
export type LogColumn = rt.TypeOf<typeof logColumnRT>;

/**
 * fields
 */
export const logEntryContextRT = rt.union([
  rt.type({}),
  rt.type({ 'container.id': rt.string }),
  rt.type({ 'host.name': rt.string, 'log.file.path': rt.string }),
]);
export type LogEntryContext = rt.TypeOf<typeof logEntryContextRT>;

export const logEntryFieldRT = rt.type({
  field: rt.string,
  value: jsonArrayRT,
});
export type LogEntryField = rt.TypeOf<typeof logEntryFieldRT>;

/**
 * entry
 */

export const logEntryRT = rt.type({
  id: rt.string,
  index: rt.string,
  cursor: logEntryCursorRT,
  columns: rt.array(logColumnRT),
  context: logEntryContextRT,
});
export type LogEntry = rt.TypeOf<typeof logEntryRT>;

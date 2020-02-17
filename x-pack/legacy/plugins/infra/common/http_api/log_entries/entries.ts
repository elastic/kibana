/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { logEntriesCursorRT } from './common';

export const LOG_ENTRIES_PATH = '/api/log_entries/entries';

export const logEntriesBaseRequestRT = rt.intersection([
  rt.type({
    sourceId: rt.string,
    startDate: rt.number,
    endDate: rt.number,
  }),
  rt.partial({
    query: rt.string,
    size: rt.number,
  }),
]);

export const logEntriesBeforeRequestRT = rt.intersection([
  logEntriesBaseRequestRT,
  rt.type({ before: rt.union([logEntriesCursorRT, rt.literal('last')]) }),
]);

export const logEntriesAfterRequestRT = rt.intersection([
  logEntriesBaseRequestRT,
  rt.type({ after: rt.union([logEntriesCursorRT, rt.literal('first')]) }),
]);

export const logEntriesCenteredRequestRT = rt.intersection([
  logEntriesBaseRequestRT,
  rt.type({ center: logEntriesCursorRT }),
]);

export const logEntriesRequestRT = rt.union([
  logEntriesBaseRequestRT,
  logEntriesBeforeRequestRT,
  logEntriesAfterRequestRT,
  logEntriesCenteredRequestRT,
]);

export type LogEntriesBaseRequest = rt.TypeOf<typeof logEntriesBaseRequestRT>;
export type LogEntriesBeforeRequest = rt.TypeOf<typeof logEntriesBeforeRequestRT>;
export type LogEntriesAfterRequest = rt.TypeOf<typeof logEntriesAfterRequestRT>;
export type LogEntriesCenteredRequest = rt.TypeOf<typeof logEntriesCenteredRequestRT>;
export type LogEntriesRequest = rt.TypeOf<typeof logEntriesRequestRT>;

// JSON value
const valueRT = rt.union([rt.string, rt.number, rt.boolean, rt.object, rt.null, rt.undefined]);

export const logMessagePartRT = rt.union([
  rt.type({
    constant: rt.string,
  }),
  rt.type({
    field: rt.string,
    value: valueRT,
    highlights: rt.array(rt.string),
  }),
]);

export const logTimestampColumnRT = rt.type({ columnId: rt.string, timestamp: rt.number });
export const logFieldColumnRT = rt.type({
  columnId: rt.string,
  field: rt.string,
  value: rt.unknown,
  highlights: rt.array(rt.string),
});
export const logMessageColumnRT = rt.type({
  columnId: rt.string,
  message: rt.array(logMessagePartRT),
});

export const logColumnRT = rt.union([logTimestampColumnRT, logFieldColumnRT, logMessageColumnRT]);

export const logEntryRT = rt.type({
  id: rt.string,
  cursor: logEntriesCursorRT,
  columns: rt.array(logColumnRT),
});

export type LogMessagepart = rt.TypeOf<typeof logMessagePartRT>;
export type LogTimestampColumn = rt.TypeOf<typeof logTimestampColumnRT>;
export type LogFieldColumn = rt.TypeOf<typeof logFieldColumnRT>;
export type LogMessageColumn = rt.TypeOf<typeof logMessageColumnRT>;
export type LogColumn = rt.TypeOf<typeof logColumnRT>;
export type LogEntry = rt.TypeOf<typeof logEntryRT>;

export const logEntriesResponseRT = rt.type({
  data: rt.type({
    entries: rt.array(logEntryRT),
    topCursor: rt.union([logEntriesCursorRT, rt.null]),
    bottomCursor: rt.union([logEntriesCursorRT, rt.null]),
  }),
});

export type LogEntriesResponse = rt.TypeOf<typeof logEntriesResponseRT>;

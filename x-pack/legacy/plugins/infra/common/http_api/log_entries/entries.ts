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

export const logEntriesCenteredRT = rt.intersection([
  logEntriesBaseRequestRT,
  rt.type({ center: logEntriesCursorRT }),
]);

export const logEntriesRequestRT = rt.union([
  logEntriesBaseRequestRT,
  logEntriesBeforeRequestRT,
  logEntriesAfterRequestRT,
  logEntriesCenteredRT,
]);

export type LogEntriesRequest = rt.TypeOf<typeof logEntriesRequestRT>;

export const logEntryRT = rt.type({
  id: rt.string,
  cursor: logEntriesCursorRT,
  columns: rt.array(rt.any),
});

export type LogEntry = rt.TypeOf<typeof logEntryRT>;

export const logEntriesResponseRT = rt.type({
  data: rt.type({
    entries: rt.array(logEntryRT),
    topCursor: logEntriesCursorRT,
    bottomCursor: logEntriesCursorRT,
  }),
});

export type LogEntriesResponse = rt.TypeOf<typeof logEntriesResponseRT>;

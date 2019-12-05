/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const LOG_ENTRY_PATH = '/api/logs/entry';

export const logEntryRequestRT = rt.type({
  sourceId: rt.string,
  id: rt.string,
});

export type LogEntryRequest = rt.TypeOf<typeof logEntryRequestRT>;

const logEntryFieldRT = rt.type({ field: rt.string, value: rt.string });

const logEntryRT = rt.type({
  id: rt.string,
  index: rt.string,
  fields: rt.array(logEntryFieldRT),
  key: rt.type({
    time: rt.number,
    tiebreaker: rt.number,
  }),
});

export const logEntryResponseRT = rt.type({
  data: logEntryRT,
});

export type LogEntryField = rt.TypeOf<typeof logEntryFieldRT>;
export type LogEntry = rt.TypeOf<typeof logEntryRT>;
export type LogEntryResponse = rt.TypeOf<typeof logEntryResponseRT>;

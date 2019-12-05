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

export const logEntryResponseRT = rt.type({
  data: rt.type({
    id: rt.string,
    index: rt.string,
    fields: rt.array(rt.type({ field: rt.string, value: rt.string })),
    key: rt.type({
      time: rt.number,
      tiebreaker: rt.number,
    }),
  }),
});
export type LogEntryResponse = rt.TypeOf<typeof logEntryResponseRT>;

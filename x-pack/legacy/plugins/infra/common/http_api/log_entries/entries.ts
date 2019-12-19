/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { esDateRT } from './common';

export const LOG_ENTRIES_PATH = '/api/log_entries/entries';

export const logEntriesRequestRT = rt.intersection([
  rt.type({
    sourceId: rt.string,
    startDate: esDateRT,
    endDate: esDateRT,
  }),
  rt.partial({
    query: rt.string,
  }),
]);

export type LogEntriesRequest = rt.TypeOf<typeof logEntriesRequestRT>;

export const logEntriesResponseRT = rt.type({
  data: rt.type({
    entries: rt.array(rt.any),
  }),
});

export type LogEntriesResponse = rt.TypeOf<typeof logEntriesResponseRT>;

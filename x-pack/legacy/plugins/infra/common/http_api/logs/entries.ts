/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as rt from 'io-ts';

export const LOGS_ENTRIES_PATH = '/api/logs/entries';

// FIXME deduplicate
const esDate = rt.union([rt.string, rt.number]);

export const logsEntriesRequestRT = rt.type({
  startDate: esDate,
  endDate: esDate,
});

export const logsEntriesResponseRT = rt.type({
  // FIXME
  entries: rt.array(rt.any),
});

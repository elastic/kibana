/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const LOGS_SUMMARY_PATH = '/api/logs/summary';

// const esDate = rt.union([rt.string, rt.number]);

export const logsSummaryRequestRT = rt.type({
  startDate: rt.number,
  endDate: rt.number,
  bucketSize: rt.number,
  query: rt.union([rt.string, rt.null]),
});

export type LogsSummaryRequest = rt.TypeOf<typeof logsSummaryRequestRT>;

export const logsSummaryResponseRT = rt.type({
  start: rt.number,
  end: rt.number,
  buckets: rt.array(
    rt.type({
      start: rt.number,
      end: rt.number,
      entriesCount: rt.number,
    })
  ),
});

export type LogsSummaryResponse = rt.TypeOf<typeof logsSummaryResponseRT>;

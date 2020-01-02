/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { logEntriesSummaryRequestRT, logEntriesSummaryBucketRT } from './summary';
import { logEntriesCursorRT } from './common';

export const LOG_ENTRIES_SUMMARY_HIGHLIGHTS_PATH = '/api/log_entries/summary_highlights';

export const logEntriesSummaryHighlightsRequestRT = rt.intersection([
  logEntriesSummaryRequestRT,
  rt.type({
    highlightTerms: rt.array(rt.string),
  }),
]);

export type LogEntriesSummaryHighlightsRequest = rt.TypeOf<
  typeof logEntriesSummaryHighlightsRequestRT
>;

export const logEntriesSummaryHighlightsBucketRT = rt.intersection([
  logEntriesSummaryBucketRT,
  rt.type({
    representativeKey: logEntriesCursorRT,
  }),
]);

export type LogEntriesSummaryHighlightsBucket = rt.TypeOf<
  typeof logEntriesSummaryHighlightsBucketRT
>;

export const logEntriesSummaryHighlightsResponseRT = rt.type({
  data: rt.array(
    rt.type({
      start: rt.number,
      end: rt.number,
      buckets: rt.array(logEntriesSummaryHighlightsBucketRT),
    })
  ),
});
export type LogEntriesSummaryHighlightsResponse = rt.TypeOf<
  typeof logEntriesSummaryHighlightsResponseRT
>;

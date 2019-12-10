/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const LOGS_SUMMARY_PATH = '/api/logs/summary';
export const LOGS_SUMMARY_HIGHLIGHTS_PATH = '/api/logs/summary_highlights';

// const esDate = rt.union([rt.string, rt.number]);

export const logsSummaryRequestRT = rt.type({
  sourceId: rt.string,
  startDate: rt.number,
  endDate: rt.number,
  bucketSize: rt.number,
  query: rt.union([rt.string, rt.undefined, rt.null]),
});

export const logsSummaryHighlightsRequestRT = rt.intersection([
  logsSummaryRequestRT,
  rt.type({
    highlightTerms: rt.array(rt.string),
  }),
]);

export type LogsSummaryRequest = rt.TypeOf<typeof logsSummaryRequestRT>;
export type LogsSummaryHighlightsRequest = rt.TypeOf<typeof logsSummaryHighlightsRequestRT>;

export const logsSummaryResponseRT = rt.type({
  data: rt.type({
    start: rt.number,
    end: rt.number,
    buckets: rt.array(
      rt.type({
        start: rt.number,
        end: rt.number,
        entriesCount: rt.number,
      })
    ),
  }),
});

export const logsSummaryHighlightsResponseRT = rt.type({
  data: rt.array(
    rt.type({
      start: rt.number,
      end: rt.number,
      buckets: rt.array(
        rt.type({
          start: rt.number,
          end: rt.number,
          entriesCount: rt.number,
          representativeKey: rt.type({
            time: rt.number,
            tiebreaker: rt.number,
          }),
        })
      ),
    })
  ),
});

export type LogsSummaryResponse = rt.TypeOf<typeof logsSummaryResponseRT>;
export type LogsSummaryHighlightsResponse = rt.TypeOf<typeof logsSummaryHighlightsResponseRT>;

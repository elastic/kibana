/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import * as rt from 'io-ts';
import { inRangeRt } from '@kbn/io-ts-utils';
import {
  logEntryAfterCursorRT,
  logEntryBeforeCursorRT,
  logEntryCursorRT,
  logEntryRT,
} from '../../log_entry';
import { logViewColumnConfigurationRT, logViewReferenceRT } from '../../log_views';
import { jsonObjectRT } from '../../typed_json';
import { searchStrategyErrorRT } from '../common/errors';

export const LOG_ENTRIES_SEARCH_STRATEGY = 'infra-log-entries';

/**
 * The response holds `size × columns` column values, and every message column carries its own
 * copy of the formatted message, so both factors must be bounded to cap memory per request.
 */
export const LOG_ENTRIES_MAX_SIZE = 1000;
export const LOG_ENTRIES_MAX_COLUMNS = 20;

const logEntriesBaseSearchRequestParamsRT = rt.intersection([
  rt.type({
    logView: logViewReferenceRT,
    startTimestamp: rt.number,
    endTimestamp: rt.number,
    size: inRangeRt(1, LOG_ENTRIES_MAX_SIZE),
  }),
  rt.partial({
    query: jsonObjectRT,
    columns: rt.array(logViewColumnConfigurationRT),
    highlightPhrase: rt.string,
  }),
]);

export const logEntriesBeforeSearchRequestParamsRT = rt.intersection([
  logEntriesBaseSearchRequestParamsRT,
  logEntryBeforeCursorRT,
]);

export const logEntriesAfterSearchRequestParamsRT = rt.intersection([
  logEntriesBaseSearchRequestParamsRT,
  logEntryAfterCursorRT,
]);

export const logEntriesSearchRequestParamsRT = rt.union([
  logEntriesBaseSearchRequestParamsRT,
  logEntriesBeforeSearchRequestParamsRT,
  logEntriesAfterSearchRequestParamsRT,
]);

export type LogEntriesSearchRequestParams = rt.TypeOf<typeof logEntriesSearchRequestParamsRT>;

export type LogEntriesSearchRequestQuery = estypes.QueryDslQueryContainer;

export const logEntriesSearchResponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.intersection([
      rt.type({
        entries: rt.array(logEntryRT),
        topCursor: rt.union([logEntryCursorRT, rt.null]),
        bottomCursor: rt.union([logEntryCursorRT, rt.null]),
      }),
      rt.partial({
        hasMoreBefore: rt.boolean,
        hasMoreAfter: rt.boolean,
      }),
    ]),
  }),
  rt.partial({
    errors: rt.array(searchStrategyErrorRT),
  }),
]);

export type LogEntriesSearchResponsePayload = rt.TypeOf<typeof logEntriesSearchResponsePayloadRT>;

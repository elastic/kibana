/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { kfetch } from 'ui/kfetch';

import { throwErrors, createPlainError } from '../../../../../common/runtime_types';

import {
  LOG_ENTRIES_SUMMARY_HIGHLIGHTS_PATH,
  LogEntriesSummaryHighlightsRequest,
  logEntriesSummaryHighlightsRequestRT,
  logEntriesSummaryHighlightsResponseRT,
} from '../../../../../common/http_api';

export const fetchLogSummaryHighlights = async (
  requestArgs: LogEntriesSummaryHighlightsRequest
) => {
  const response = await kfetch({
    method: 'POST',
    pathname: LOG_ENTRIES_SUMMARY_HIGHLIGHTS_PATH,
    body: JSON.stringify(logEntriesSummaryHighlightsRequestRT.encode(requestArgs)),
  });

  return pipe(
    logEntriesSummaryHighlightsResponseRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};

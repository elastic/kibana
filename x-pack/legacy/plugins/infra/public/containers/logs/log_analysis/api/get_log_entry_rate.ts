/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { kfetch } from 'ui/kfetch';

import {
  getLogEntryRateRequestPayloadRT,
  getLogEntryRateSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
} from '../../../../../common/http_api/log_analysis';
import { createPlainError, throwErrors } from '../../../../../common/runtime_types';

export const callGetLogEntryRateAPI = async (
  sourceId: string,
  startTime: number,
  endTime: number,
  bucketDuration: number
) => {
  const response = await kfetch({
    method: 'POST',
    pathname: LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
    body: JSON.stringify(
      getLogEntryRateRequestPayloadRT.encode({
        data: {
          sourceId,
          timeRange: {
            startTime,
            endTime,
          },
          bucketDuration,
        },
      })
    ),
  });
  return pipe(
    getLogEntryRateSuccessReponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};

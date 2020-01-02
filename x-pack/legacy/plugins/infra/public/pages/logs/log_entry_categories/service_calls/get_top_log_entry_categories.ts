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
  getLogEntryCategoriesRequestPayloadRT,
  getLogEntryCategoriesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH,
} from '../../../../../common/http_api/log_analysis';
import { createPlainError, throwErrors } from '../../../../../common/runtime_types';

export const callGetTopLogEntryCategoriesAPI = async (
  sourceId: string,
  startTime: number,
  endTime: number,
  categoryCount: number
) => {
  const intervalDuration = endTime - startTime;

  const response = await kfetch({
    method: 'POST',
    pathname: LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH,
    body: JSON.stringify(
      getLogEntryCategoriesRequestPayloadRT.encode({
        data: {
          sourceId,
          timeRange: {
            startTime,
            endTime,
          },
          categoryCount,
          histograms: [
            {
              id: 'history',
              timeRange: {
                startTime: startTime - intervalDuration,
                endTime,
              },
              bucketCount: 10,
            },
            {
              id: 'reference',
              timeRange: {
                startTime: startTime - intervalDuration,
                endTime: startTime,
              },
              bucketCount: 1,
            },
          ],
        },
      })
    ),
  });
  return pipe(
    getLogEntryCategoriesSuccessReponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};

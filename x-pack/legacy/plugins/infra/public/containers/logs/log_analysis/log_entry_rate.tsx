/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState } from 'react';
import { kfetch } from 'ui/kfetch';

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import {
  getLogEntryRateRequestPayloadRT,
  getLogEntryRateSuccessReponsePayloadRT,
  GetLogEntryRateSuccessResponsePayload,
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
} from '../../../../common/http_api/log_analysis';
import { createPlainError, throwErrors } from '../../../../common/runtime_types';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';

type LogEntryRateResults = GetLogEntryRateSuccessResponsePayload['data'];

export const useLogEntryRate = ({
  sourceId,
  startTime,
  endTime,
  bucketDuration,
}: {
  sourceId: string;
  startTime: number;
  endTime: number;
  bucketDuration: number;
}) => {
  const [logEntryRate, setLogEntryRate] = useState<LogEntryRateResults | null>(null);

  const [getLogEntryRateRequest, getLogEntryRate] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await kfetch({
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
      },
      onResolve: response => {
        const { data } = pipe(
          getLogEntryRateSuccessReponsePayloadRT.decode(response),
          fold(throwErrors(createPlainError), identity)
        );

        setLogEntryRate(data);
      },
    },
    [sourceId, startTime, endTime, bucketDuration]
  );

  const isLoading = useMemo(() => getLogEntryRateRequest.state === 'pending', [
    getLogEntryRateRequest.state,
  ]);

  return {
    getLogEntryRate,
    isLoading,
    logEntryRate,
  };
};

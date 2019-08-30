/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState } from 'react';
import { kfetch } from 'ui/kfetch';

import {
  getLogEntryRateRequestPayloadRT,
  getLogEntryRateSuccessReponsePayloadRT,
  GetLogEntryRateSuccessResponsePayload,
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
} from '../../../../common/http_api/log_analysis';
import { createPlainError, throwErrors } from '../../../../common/runtime_types';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';

type LogEntryRateResults = GetLogEntryRateSuccessResponsePayload['data'];

export const useLogEntryRate = ({ sourceId }: { sourceId: string }) => {
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
                sourceId, // TODO: get from hook arguments
                timeRange: {
                  startTime: Date.now(), // TODO: get from hook arguments
                  endTime: Date.now() + 1000 * 60 * 60, // TODO: get from hook arguments
                },
                bucketDuration: 15 * 60 * 1000, // TODO: get from hook arguments
              },
            })
          ),
        });
      },
      onResolve: response => {
        const { data } = getLogEntryRateSuccessReponsePayloadRT
          .decode(response)
          .getOrElseL(throwErrors(createPlainError));

        setLogEntryRate(data);
      },
    },
    [sourceId]
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

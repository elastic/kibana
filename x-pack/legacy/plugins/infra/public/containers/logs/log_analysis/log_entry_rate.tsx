/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState } from 'react';

import { GetLogEntryRateSuccessResponsePayload } from '../../../../common/http_api/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callGetLogEntryRateAPI } from './api/get_log_entry_rate';

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
        return await callGetLogEntryRateAPI(sourceId, startTime, endTime, bucketDuration);
      },
      onResolve: response => {
        setLogEntryRate(response.data);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import { useMemo, useEffect } from 'react';

import { useLogEntryRate } from './log_entry_rate';

export const useLogAnalysisResults = ({
  sourceId,
  startTime,
  endTime,
  bucketDuration = 15 * 60 * 1000,
}: {
  sourceId: string;
  startTime: number;
  endTime: number;
  bucketDuration?: number;
}) => {
  const { isLoading: isLoadingLogEntryRate, logEntryRate, getLogEntryRate } = useLogEntryRate({
    sourceId,
    startTime,
    endTime,
    bucketDuration,
  });

  const isLoading = useMemo(() => isLoadingLogEntryRate, [isLoadingLogEntryRate]);

  useEffect(() => {
    getLogEntryRate();
  }, [sourceId, startTime, endTime, bucketDuration]);

  return {
    isLoading,
    logEntryRate,
  };
};

export const LogAnalysisResults = createContainer(useLogAnalysisResults);

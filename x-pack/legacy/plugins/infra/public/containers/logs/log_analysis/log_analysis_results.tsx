/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest/dist/ts/src';
import { useMemo } from 'react';

import { useLogEntryRate } from './log_entry_rate';

export const useLogAnalysisResults = ({ sourceId }: { sourceId: string }) => {
  const { isLoading: isLoadingLogEntryRate, logEntryRate } = useLogEntryRate({ sourceId });

  const isLoading = useMemo(() => isLoadingLogEntryRate, [isLoadingLogEntryRate]);

  return {
    isLoading,
    logEntryRate,
  };
};

export const LogAnalysisResults = createContainer(useLogAnalysisResults);

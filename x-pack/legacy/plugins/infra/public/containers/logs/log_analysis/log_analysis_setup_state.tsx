/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState, useCallback } from 'react';

interface Props {
  setupModule: (startTime?: number | undefined, endTime?: number | undefined) => void;
  retrySetup: (startTime?: number | undefined, endTime?: number | undefined) => void;
}

export const useAnalysisSetupState = ({ setupModule, retrySetup }: Props) => {
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const [endTime, setEndTime] = useState<number | undefined>(undefined);
  const setup = useCallback(() => {
    return setupModule(startTime, endTime);
  }, [setupModule, startTime, endTime]);
  const retry = useCallback(() => {
    return retrySetup(startTime, endTime);
  }, [retrySetup, startTime, endTime]);
  return {
    setup,
    retry,
    setStartTime,
    setEndTime,
    startTime,
    endTime,
  };
};

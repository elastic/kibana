/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState, useCallback } from 'react';

type SetupHandler = (startTime?: number | undefined, endTime?: number | undefined) => void;

interface Props {
  cleanupAndSetupModule: SetupHandler;
  setupModule: SetupHandler;
}

const fourWeeksInMs = 86400000 * 7 * 4;

export const useAnalysisSetupState = ({ setupModule, cleanupAndSetupModule }: Props) => {
  const [startTime, setStartTime] = useState<number | undefined>(Date.now() - fourWeeksInMs);
  const [endTime, setEndTime] = useState<number | undefined>(undefined);

  const setup = useCallback(() => {
    return setupModule(startTime, endTime);
  }, [setupModule, startTime, endTime]);

  const cleanupAndSetup = useCallback(() => {
    return cleanupAndSetupModule(startTime, endTime);
  }, [cleanupAndSetupModule, startTime, endTime]);

  return {
    cleanupAndSetup,
    endTime,
    setEndTime,
    setStartTime,
    setup,
    startTime,
  };
};

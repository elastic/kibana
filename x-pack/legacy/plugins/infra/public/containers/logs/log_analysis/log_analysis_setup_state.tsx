/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState, useCallback } from 'react';
import { Moment } from 'moment';

interface Props {
  setupModule: (startTime?: number | undefined, endTime?: number | undefined) => void;
  retrySetup: (startTime?: number | undefined, endTime?: number | undefined) => void;
}
function selectedDateToParam(selectedDate: Moment | null) {
  if (selectedDate) {
    return selectedDate.valueOf(); // To ms unix timestamp
  }
  return undefined;
}

export const useAnalysisSetupState = ({ setupModule, retrySetup }: Props) => {
  const [startTime, setStartTime] = useState<Moment | null>(null);
  const [endTime, setEndTime] = useState<Moment | null>(null);
  const setup = useCallback(() => {
    return setupModule(selectedDateToParam(startTime), selectedDateToParam(endTime));
  }, [setupModule, startTime, endTime]);
  const retry = useCallback(() => {
    return retrySetup(selectedDateToParam(startTime), selectedDateToParam(endTime));
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

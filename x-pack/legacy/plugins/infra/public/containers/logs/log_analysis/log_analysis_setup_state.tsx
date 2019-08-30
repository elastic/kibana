/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState, useCallback } from 'react';
import { Moment } from 'moment';

interface Props {
  setupMlModule: (startTime?: number | undefined, endTime?: number | undefined) => Promise<any>;
}

function selectedDateToParam(selectedDate: Moment | null) {
  if (selectedDate) {
    return selectedDate.valueOf(); // To ms unix timestamp
  }
  return undefined;
}

export const useAnalysisSetupState = ({ setupMlModule }: Props) => {
  const [startTime, setStartTime] = useState<Moment | null>(null);
  const [endTime, setEndTime] = useState<Moment | null>(null);
  const [hasAttemptedSetup, setHasAttemptedSetup] = useState<boolean>(false);
  const setup = useCallback(() => {
    setHasAttemptedSetup(true);
    return setupMlModule(selectedDateToParam(startTime), selectedDateToParam(endTime));
  }, [setupMlModule, setHasAttemptedSetup]);
  return {
    hasAttemptedSetup,
    setup,
    setStartTime,
    setEndTime,
    startTime,
    endTime,
  };
};

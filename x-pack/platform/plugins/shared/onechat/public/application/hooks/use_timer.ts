/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

interface UseTimerOptions {
  isLoading: boolean;
}

interface UninitializedTimer {
  showTimer: false;
  elapsedTime: undefined;
  isStopped: undefined;
}

interface InitializedTimer {
  showTimer: true;
  elapsedTime: number;
  isStopped: boolean;
}

export type Timer = UninitializedTimer | InitializedTimer;

export const useTimer = ({ isLoading }: UseTimerOptions): Timer => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const hasStartedRef = useRef(false);
  const [isStopped, setIsStopped] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      setElapsedTime(0);
      hasStartedRef.current = true;
      setIsStopped(false);
      intervalRef.current ??= setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (hasStartedRef.current) {
        setIsStopped(true);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLoading]);

  if (!hasStartedRef.current) {
    return { showTimer: false, elapsedTime: undefined, isStopped: undefined };
  }

  return {
    showTimer: true,
    elapsedTime,
    isStopped,
  };
};

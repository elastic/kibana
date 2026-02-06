/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState, useEffect, useCallback } from 'react';

export const usePolling = () => {
  const pollIntervalRef = useRef<number | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);

  const [isPolling, setIsPolling] = useState(false);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(
    (intervalMs: number, onPoll: () => void, timeoutMs?: number, onTimeout?: () => void) => {
      pollIntervalRef.current = window.setInterval(() => onPoll(), intervalMs);

      if (timeoutMs) {
        pollTimeoutRef.current = window.setTimeout(() => {
          stopPolling();
          onTimeout?.();
        }, timeoutMs);
      }
      setIsPolling(true);
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    isPolling,
    startPolling,
    stopPolling,
  };
};

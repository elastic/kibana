/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Custom hook for managing optimistic updates with automatic reversion
 *
 * @param actualValue - The actual value from the server/parent component
 * @param timeoutMs - Timeout in milliseconds before reverting optimistic value (default: 5000)
 * @returns Object containing the effective value and setter function
 */
export const useOptimisticSelection = <T>(
  actualValue: T,
  timeoutMs: number = 5000
): {
  effectiveValue: T;
  setOptimisticValue: (value: T) => void;
} => {
  const [optimisticValue, setOptimisticValue] = useState<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle optimistic update lifecycle
  useEffect(() => {
    // If the actual value updates and matches our optimistic value, clear the optimistic state
    if (optimisticValue !== null && actualValue === optimisticValue) {
      setOptimisticValue(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [actualValue, optimisticValue]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const setOptimistic = useCallback(
    (value: T) => {
      // Set optimistic value immediately for instant UI feedback
      setOptimisticValue(value);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set timeout to revert optimistic value after specified time if actualValue doesn't update
      timeoutRef.current = setTimeout(() => {
        setOptimisticValue(null);
        timeoutRef.current = null;
      }, timeoutMs);
    },
    [timeoutMs]
  );

  // Return optimistic value if available, otherwise fall back to actual value
  const effectiveValue = optimisticValue !== null ? optimisticValue : actualValue;

  return {
    effectiveValue,
    setOptimisticValue: setOptimistic,
  };
};

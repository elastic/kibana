/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook to manage an AbortController for canceling in-flight async operations.
 * Automatically aborts previous operations when a new one starts, and cleans up on unmount.
 *
 * @returns An object with:
 *   - `getAbortController`: Function that returns a new AbortController, aborting any previous one
 *   - `abort`: Function to manually abort the current operation
 *   - `isAborted`: Function to check if the current controller is aborted
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Gets a new AbortController, aborting any previous one.
   * This ensures only one async operation is active at a time.
   */
  const getAbortController = useCallback((): AbortController => {
    // Abort any in-flight operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller for this operation
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller;
  }, []);

  /**
   * Manually abort the current operation
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Check if the current controller is aborted
   */
  const isAborted = useCallback((controller: AbortController): boolean => {
    return controller.signal.aborted;
  }, []);

  /**
   * Check if the current ref controller matches the given controller
   */
  const isCurrentController = useCallback((controller: AbortController): boolean => {
    return abortControllerRef.current === controller;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    getAbortController,
    abort,
    isAborted,
    isCurrentController,
  };
}

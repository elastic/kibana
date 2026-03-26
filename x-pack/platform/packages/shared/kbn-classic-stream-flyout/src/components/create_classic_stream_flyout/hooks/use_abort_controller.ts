/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback, useEffect } from 'react';

/**
 * A minimal hook for managing AbortController instances with automatic cleanup.
 *
 * ## Why Not Use `@kbn/react-hooks` `useAbortController`?
 *
 * The existing `@kbn/react-hooks` implementation uses `useState` to store the controller:
 * ```typescript
 * const [controller, setController] = useState(() => new AbortController());
 * ```
 *
 * **Problem**: When you call `refresh()` to get a new controller, it triggers a React state update,
 * which causes the component to re-render. This is unnecessary overhead - we don't need to re-render
 * the component just because we're starting a new async operation.
 *
 * **Our approach**: Uses `useRef` instead of `useState`, so getting a new controller via
 * `getAbortController()` doesn't trigger re-renders. This is more efficient for our use case where
 * we frequently start new validation operations (on every keystroke with debouncing).
 *
 * ## Why Not Use Other Libraries?
 *
 * **`react-use` `useAsyncFn` / `useAsync`**: These manage the entire async operation lifecycle
 * (loading, error, value states) which we don't need - we manage state in our reducer. They also
 * don't provide multiple independent abort controllers, which we need for separate "create" and
 * "debounced" validation flows.
 *
 * **`use-abortable-fetch` and similar**: Tightly coupled to fetch operations. We need abort
 * controllers for general async operations (validation functions that may or may not use fetch).
 *
 * ## Our Implementation
 *
 * - Uses `useRef` (no re-renders on controller changes)
 * - Auto-aborts previous operation when starting new one via `getAbortController()`
 * - Manual abort via `abort()`
 * - Check if a specific controller is aborted via `isAborted(controller)`
 * - Auto cleanup on unmount
 *
 * @example
 * ```typescript
 * const { getAbortController, abort } = useAbortController();
 *
 * async function validate() {
 *   const controller = getAbortController(); // Aborts any previous call, no re-render
 *   const result = await api.validate(name, controller.signal);
 *   if (controller.signal.aborted) return; // Check before using result
 *   // ... use result
 * }
 *
 * // Can manually abort if needed
 * abort();
 * ```
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const getAbortController = useCallback((): AbortController => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller;
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const isAborted = useCallback((controller: AbortController): boolean => {
    return controller.signal.aborted;
  }, []);

  const isCurrentController = useCallback((controller: AbortController): boolean => {
    return abortControllerRef.current === controller;
  }, []);

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

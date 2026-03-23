/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A custom React hook for debouncing callbacks that solves a critical problem:
 * **accessing the latest state/props inside debounced functions**.
 *
 * ## The Problem
 *
 * Standard debounce solutions in React have a closure problem. When you create a debounced
 * function, it captures the current values of state/props. If those values change before
 * the debounced function executes, it will still see the old values:
 *
 * ```typescript
 * // ❌ Problem: Standard approach
 * const [count, setCount] = useState(0);
 * const debouncedLog = useMemo(
 *   () => debounce(() => console.log(count), 300),
 *   [] // Can't include count or it recreates the debounce!
 * );
 * // When debouncedLog runs, it logs 0 even if count is now 5
 * ```
 *
 * ## Why Not Use Existing Libraries?
 *
 * **`@kbn/react-hooks` `useDebounceFn`**: The debounced callback captures state at creation time.
 * If `isLoading` changes from `false` to `true`, the callback still sees `false`. This forces
 * you to use refs for everything, making your code harder to maintain.
 *
 * **`react-use` `useDebounce`**: Debounces values (like state), not callbacks. It's designed for
 * "wait until user stops typing to update the value", not "wait to execute a function". Also
 * proxies `useEffect` requiring you to manually pass a dependency array, which can't be linted
 * by `eslint-plugin-react-hooks`, making it fragile and error-prone. No cancellation support.
 *
 * **`lodash` `debounce`**: Works great outside React, but requires manual `useMemo` setup, manual
 * cleanup in `useEffect`, and has the same closure issues. Too much boilerplate.
 *
 * ## This Hook's Solution
 *
 * - ✅ **Latest values**: Callback ref is updated every render, so your function always sees current state/props
 * - ✅ **Stable references**: `trigger` and `cancel` don't change (safe for dependency arrays)
 * - ✅ **Automatic cleanup**: Pending timeouts cleared on unmount
 * - ✅ **Simple API**: No boilerplate, just works
 *
 * @example
 *
 * ```typescript
 * function SearchComponent() {
 *   const [query, setQuery] = useState('');
 *   const [isLoading, setIsLoading] = useState(false);
 *
 *   const { trigger: search, cancel } = useDebouncedCallback(
 *     async (searchTerm: string) => {
 *       // ✅ Always sees current isLoading, even if it changed after trigger was called
 *       if (isLoading) return;
 *
 *       setIsLoading(true);
 *       const results = await api.search(searchTerm);
 *       setResults(results);
 *       setIsLoading(false);
 *     },
 *     300
 *   );
 *
 *   return (
 *     <input
 *       value={query}
 *       onChange={(e) => {
 *         setQuery(e.target.value);
 *         search(e.target.value); // Debounced
 *       }}
 *     />
 *   );
 * }
 * ```
 *
 * ## When to Use This
 *
 * - Debouncing search/validation API calls that depend on current component state
 * - Debouncing user input that needs to check loading/submission flags
 * - Any debounced operation that needs to access "fresh" state/props
 *
 * @param callback - The function to debounce (will always access latest closure values)
 * @param delay - Debounce delay in milliseconds
 * @returns Object with `trigger` (debounced version) and `cancel` (abort pending execution)
 */

import { useCallback, useEffect, useRef } from 'react';

interface UseDebouncedCallbackReturn<T extends (...args: any[]) => any> {
  trigger: T;
  cancel: () => void;
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): UseDebouncedCallbackReturn<T> {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  });

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const trigger = useCallback(
    (...args: Parameters<T>) => {
      cancel();
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay, cancel]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { trigger, cancel };
}

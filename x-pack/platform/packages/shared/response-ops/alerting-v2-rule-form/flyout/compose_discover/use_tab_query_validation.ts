/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { validateQuery } from '@kbn/esql-language';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { QueryTab } from './types';

const VALIDATION_DEBOUNCE_MS = 256;

export interface UseTabQueryValidationParams {
  /** Query text to statically validate per tab. Omit a tab (or pass '') to skip it. */
  queries: Partial<Record<QueryTab, string>>;
  callbacks: ESQLCallbacks;
}

export interface UseTabQueryValidationResult {
  /** Tabs whose query currently has at least one validation error. */
  errorTabs: QueryTab[];
  hasErrors: boolean;
}

/**
 * Runs static ES|QL validation against every tab's query — including tabs the
 * user hasn't switched to or run — so callers can block an action (e.g. Apply)
 * until all tabs are error-free, without displaying errors for inactive tabs.
 */
export const useTabQueryValidation = ({
  queries,
  callbacks,
}: UseTabQueryValidationParams): UseTabQueryValidationResult => {
  const [errorTabs, setErrorTabs] = useState<QueryTab[]>([]);

  /*
   * Kept in a ref so the debounce timer always validates with the latest
   * callbacks without re-triggering the effect when the callbacks object changes.
   */
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const { base = '', alert = '', recovery = '' } = queries;

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      const entries: Array<[QueryTab, string]> = [
        ['base', base],
        ['alert', alert],
        ['recovery', recovery],
      ];

      const results = await Promise.all(
        entries.map(async ([tab, query]) => {
          if (!query.trim()) return null;
          try {
            const { errors } = await validateQuery(query, callbacksRef.current);
            return errors.length > 0 ? tab : null;
          } catch {
            return null;
          }
        })
      );

      if (!cancelled) {
        setErrorTabs(results.filter((tab): tab is QueryTab => tab !== null));
      }
    }, VALIDATION_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [base, alert, recovery]);

  return { errorTabs, hasErrors: errorTabs.length > 0 };
};

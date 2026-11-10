/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useReducer } from 'react';
import { isSnoozed } from './is_snoozed';

// setTimeout fires immediately for longer delays, so long snoozes are rechecked in steps.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** Like `isSnoozed`, but re-renders the caller when the snooze expires. */
export const useIsSnoozed = (snoozedUntil: string | undefined | null): boolean => {
  const [checkCount, recheck] = useReducer((count: number) => count + 1, 0);
  const snoozed = isSnoozed(snoozedUntil);

  useEffect(() => {
    if (!snoozed || snoozedUntil == null) {
      return;
    }
    const remainingMs = new Date(snoozedUntil).getTime() - Date.now();
    const timeout = setTimeout(recheck, Math.min(remainingMs, MAX_TIMEOUT_MS));
    return () => clearTimeout(timeout);
  }, [snoozed, snoozedUntil, checkCount]);

  return snoozed;
};

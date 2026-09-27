/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { MatchedActionPolicy } from '@kbn/alerting-v2-schemas';

/** setTimeout delay is a 32-bit signed integer. Longer snoozes are rescheduled. */
const MAX_TIMEOUT_MS = 2_147_483_647;

const getSoonestSnoozeExpiry = (
  items: readonly MatchedActionPolicy[],
  now: number
): number | null => {
  let soonest: number | null = null;
  for (const item of items) {
    const snoozedUntil = item.action_policy.snoozed_until;
    if (snoozedUntil == null) {
      continue;
    }
    const expiry = new Date(snoozedUntil).getTime();
    if (Number.isNaN(expiry) || expiry <= now) {
      continue;
    }
    if (soonest == null || expiry < soonest) {
      soonest = expiry;
    }
  }
  return soonest;
};

/** Re-renders when the soonest snooze expiry is reached so the badge clears without a reload. */
export const useRerenderWhenSnoozeExpires = (items: readonly MatchedActionPolicy[]): void => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const soonest = getSoonestSnoozeExpiry(items, Date.now());
    if (soonest == null) {
      return;
    }
    const delay = Math.min(soonest - Date.now(), MAX_TIMEOUT_MS);
    const timer = window.setTimeout(() => setTick((current) => current + 1), delay);
    return () => window.clearTimeout(timer);
  }, [items, tick]);
};

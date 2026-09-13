/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

interface DateWindowParams {
  isScheduled: boolean;
  timestamp?: string;
  lastResultTime?: string[];
  interval?: number;
}

interface DateWindowResult {
  startDate: string | undefined;
  endDate: string | undefined;
  mode: 'absolute' | 'relative' | undefined;
}

const UNSET_WINDOW: DateWindowResult = {
  startDate: undefined,
  endDate: undefined,
  mode: undefined,
};

export const getPackViewDateWindow = ({
  isScheduled,
  timestamp,
  lastResultTime,
  interval,
}: DateWindowParams): DateWindowResult => {
  if (isScheduled) {
    if (!timestamp) {
      return UNSET_WINDOW;
    }

    return {
      startDate: moment(timestamp).subtract(1, 'hour').toISOString(),
      endDate: moment(timestamp).add(1, 'hour').toISOString(),
      mode: 'absolute',
    };
  }

  const lastResult = lastResultTime?.[0];

  if (timestamp) {
    // The end stays open. Any fixed end would be a render-time snapshot: results
    // keep arriving while the row is on screen, and `usePackQueryLastResults` has
    // no `refetchInterval`, so a `lastResultTime`-derived bound freezes wherever
    // the first fetch landed and cuts off slow agents — the SDH symptom.
    //
    // The action's `expiration` is no bound either: it is `@timestamp + 2 weeks`
    // (`ACTION_EXPIRATION_WEEKS`), always far past both `now` and any result.
    return { startDate: moment(timestamp).toISOString(), endDate: 'now', mode: 'relative' };
  }

  // Defensive fallback only. `interval` lives on scheduled pack queries, which
  // never carry the `action_id` needed to render results, so neither branch below
  // is reachable from a row a user can click through to Discover or Lens today.
  if (interval) {
    return lastResult
      ? {
          startDate: moment(lastResult).subtract(interval, 'seconds').toISOString(),
          endDate: moment(lastResult).toISOString(),
          mode: 'absolute',
        }
      : {
          startDate: `now-${interval}s`,
          endDate: 'now',
          mode: 'relative',
        };
  }

  return UNSET_WINDOW;
};

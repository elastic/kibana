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
  expirationDate?: string;
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

/**
 * End bound for a live action, mirroring the toolbar "View in Discover" button,
 * which ends its window at the action's `expiration`. Without an expiration the
 * end is left open so results ingested after this render still show up.
 */
const getLiveEndBound = ({
  lastResult,
  expirationDate,
}: {
  lastResult?: string;
  expirationDate?: string;
}): moment.Moment | undefined => {
  if (!expirationDate) {
    return lastResult ? moment(lastResult) : undefined;
  }

  return moment.min(lastResult ? moment(lastResult) : moment(), moment(expirationDate));
};

export const getPackViewDateWindow = ({
  isScheduled,
  timestamp,
  expirationDate,
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
    const start = moment(timestamp);
    const end = getLiveEndBound({ lastResult, expirationDate });

    if (!end) {
      return { startDate: start.toISOString(), endDate: 'now', mode: 'relative' };
    }

    // `timestamp` is stamped by Kibana when the action is created, while the end
    // bound comes from `event.ingested` on the agent's own documents. Clock skew
    // between the two can invert the range, and Elasticsearch answers `gte > lte`
    // with zero hits and no error — the same symptom as the collapsed window this
    // function exists to avoid. Order the bounds so both instants stay inside it.
    const [from, to] = end.isBefore(start) ? [end, start] : [start, end];

    return { startDate: from.toISOString(), endDate: to.toISOString(), mode: 'absolute' };
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

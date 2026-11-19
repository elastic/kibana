/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRule } from '@kbn/rrule';
import type { Rrule } from '@kbn/response-ops-scheduling-types';

/**
 * Returns the first occurrence of an rrule after the given date, or null if there is none.
 */
export const getNextRruleOccurrence = (rrule: Rrule, from: Date): Date | null => {
  const { dtstart, ...rest } = rrule;
  // RRule.after is inclusive, so step past the start date to get the following occurrence
  // instead of the one landing on it.
  // Mirror how Task Manager builds the rrule so the result matches the task's real run time:
  // an explicit dtstart is used as is, otherwise start from now pinned to the start of the
  // minute. See task_manager/server/lib/get_first_run_at.ts.
  return new RRule(
    dtstart
      ? { ...rest, dtstart: new Date(dtstart) }
      : { ...rest, dtstart: new Date(), bysecond: [0] }
  ).after(new Date(from.getTime() + 1));
};

/**
 * Returns the occurrences of an rrule after `start` and up to `end`, at most `maxEntries` of them.
 */
export const getRruleOccurrences = (
  rrule: Rrule,
  start: string,
  end: string,
  maxEntries?: number
): Date[] => {
  // Walks the rrule one occurrence at a time, re-anchoring dtstart to the previous occurrence the
  // way Task Manager's getNextRunAt does. RRule.between would materialise every occurrence since
  // the original dtstart and throws once it passes its internal iteration limit, which a wide
  // range easily does.
  const endMs = new Date(end).valueOf();
  const occurrences: Date[] = [];
  // Start strictly after the range start, so the first occurrence closes the window that opens
  // at the range start rather than landing on it.
  let cursor = new Date(start);

  while (!maxEntries || occurrences.length < maxEntries) {
    const next = new RRule({ ...rrule, dtstart: cursor }).after(new Date(cursor.valueOf() + 1));

    if (!next || next.valueOf() > endMs) {
      break;
    }

    occurrences.push(next);
    cursor = next;
  }

  return occurrences;
};

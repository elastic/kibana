/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createHash } from 'crypto';
import moment from 'moment';

import { parseDuration } from '../../../../../alerting/server/lib';

export const generateId = (
  docIndex: string,
  docId: string,
  version: string,
  ruleId: string
): string =>
  createHash('sha256')
    .update(docIndex.concat(docId, version, ruleId))
    .digest('hex');

export const parseInterval = (intervalString: string): moment.Duration | null => {
  try {
    return moment.duration(parseDuration(intervalString));
  } catch (err) {
    return null;
  }
};

export const getDriftTolerance = ({
  from,
  to,
  interval,
}: {
  from: string;
  to: string;
  interval: moment.Duration;
}): moment.Duration | null => {
  if (to.trim() !== 'now') {
    // we only support 'now' for drift detection
    return null;
  }
  if (!from.trim().startsWith('now-')) {
    // we only support from tha starts with now for drift detection
    return null;
  }
  const split = from.split('-');
  const duration = parseInterval(split[1]);
  if (duration !== null) {
    return duration.subtract(interval);
  } else {
    return null;
  }
};

export const getGapBetweenRuns = ({
  previousStartedAt,
  interval,
  from,
  to,
  now = moment(),
}: {
  previousStartedAt: moment.Moment | undefined | null;
  interval: string;
  from: string;
  to: string;
  now?: moment.Moment;
}): moment.Duration | null => {
  if (previousStartedAt == null) {
    return null;
  }
  const intervalDuration = parseInterval(interval);
  if (intervalDuration == null) {
    return null;
  }
  const driftTolerance = getDriftTolerance({ from, to, interval: intervalDuration });
  if (driftTolerance == null) {
    return null;
  }
  const diff = moment.duration(now.diff(previousStartedAt));
  const drift = diff.subtract(intervalDuration);
  return drift.subtract(driftTolerance);
};

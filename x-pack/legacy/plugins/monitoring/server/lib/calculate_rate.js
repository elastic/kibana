/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

/*
 * Calculate "Per-Second" Rate from Metrics
 * Uses first/last totals and data timestamp bounds in millis
 *
 * Indexing rate example:
 * 1. Take the latest index total
 * 2. From that subtract the earliest index total
 * This gives you the numerator
 *
 * 3. Take the timestamp from the latest hit
 * 4. From that subtract the timestamp of the earliest hit
 * This gives you the denominator in millis. Divide it by 1000 to convert to seconds
 */
export function calculateRate(
  {
    hitTimestamp = null,
    earliestHitTimestamp = null,
    latestTotal = null,
    earliestTotal = null
  } = {}
) {
  const nullResult = {
    rate: null,
    isEstimate: false
  };

  // check if any params used for calculations are null
  if (hitTimestamp === null || earliestHitTimestamp === null || latestTotal === null || earliestTotal === null) {
    return nullResult;
  }

  const hitTimestampMoment = moment(hitTimestamp).valueOf();
  const earliestHitTimestampMoment = moment(earliestHitTimestamp).valueOf();
  const hitsTimeDelta = hitTimestampMoment - earliestHitTimestampMoment;

  if (hitsTimeDelta < 1) {
    return nullResult;
  }

  let rate = null;
  let isEstimate = false;
  if (hitsTimeDelta !== 0) {
    const totalDelta = latestTotal - earliestTotal;
    if (totalDelta < 0) {
      rate = latestTotal / (hitsTimeDelta / 1000); // a restart caused an unwanted negative rate
      isEstimate = true;
    } else {
      rate = totalDelta / (hitsTimeDelta / 1000);
    }
  }

  return {
    rate,
    isEstimate,
  };
}

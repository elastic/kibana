/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

/*
 * Calculate "Per-Second" Rate from Metrics
 * Uses first/last totals and time window bounds in millis
 *
 * Indexing rate example:
 * 1. Take the latest index total
 * 2. From that subtract the earliest index total
 * This gives you the numerator
 *
 * 3. Take the latest timestamp from the time picker
 * 4. From that subtract the earliest timestamp from the time picker
 * This gives you the denominator in millis. Divide it by 1000 to convert to seconds
 */

interface CalculateRateProps {
  hitTimestamp: string | null;
  earliestHitTimestamp: string | null;
  latestTotal?: string | number | null;
  earliestTotal?: string | number | null;
  timeWindowMin: number;
  timeWindowMax: number;
}

export function calculateRate({
  hitTimestamp = null,
  earliestHitTimestamp = null,
  latestTotal = null,
  earliestTotal = null,
  timeWindowMin,
  timeWindowMax,
}: CalculateRateProps) {
  const nullResult = {
    rate: null,
    isEstimate: false,
  };

  // check if any params used for calculations are null
  if (
    hitTimestamp === null ||
    earliestHitTimestamp === null ||
    latestTotal === null ||
    earliestTotal === null
  ) {
    return nullResult;
  }

  const hitTimestampMoment = moment(hitTimestamp).valueOf();
  const earliestHitTimestampMoment = moment(earliestHitTimestamp).valueOf();
  const hitsTimeDelta = hitTimestampMoment - earliestHitTimestampMoment;

  if (hitsTimeDelta < 1) {
    return nullResult;
  }

  const earliestTimeInMillis = moment(timeWindowMin).valueOf();
  const latestTimeInMillis = moment(timeWindowMax).valueOf();
  const millisDelta = latestTimeInMillis - earliestTimeInMillis;

  let rate = null;
  let isEstimate = false;
  if (millisDelta !== 0) {
    const totalDelta = Number(latestTotal) - Number(earliestTotal);
    if (totalDelta < 0) {
      rate = Number(latestTotal) / (millisDelta / 1000); // a restart caused an unwanted negative rate
      isEstimate = true;
    } else {
      rate = totalDelta / (millisDelta / 1000);
    }
  }

  return {
    rate,
    isEstimate,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { niceTimeFormatByDay, timeFormatter } from '@elastic/charts';
import moment from 'moment-timezone';

export const getDaysDiff = (minDate: moment.Moment, maxDate: moment.Moment) => {
  const diff = maxDate.diff(minDate, 'days');

  if (diff <= 1 && !minDate.isSame(maxDate)) {
    return 2; // to return proper pattern from niceTimeFormatByDay
  }

  return diff;
};

export const histogramDateTimeFormatter = (domain: [number, number] | null, fixedDiff?: number) => {
  const diff = fixedDiff ?? getDaysDiff(moment(domain![0]), moment(domain![1]));
  const format = niceTimeFormatByDay(diff);
  return timeFormatter(format);
};

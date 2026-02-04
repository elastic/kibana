/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import { ISO_WEEKDAYS_TO_RRULE } from '../constants';
import { getWeekdayInfo } from './get_weekday_info';

export const getNthByWeekday = (startDate: Moment) => {
  const { isLastOfMonth, nthWeekdayOfMonth } = getWeekdayInfo(startDate);
  return `${isLastOfMonth ? '-1' : '+' + nthWeekdayOfMonth}${
    ISO_WEEKDAYS_TO_RRULE[startDate.isoWeekday()]
  }`;
};

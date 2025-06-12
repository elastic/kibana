/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WEEKDAY_REGEX } from '../../constants';

export const validateOnWeekDay = (array: string[]) => {
  if (array.length === 0) {
    return 'OnWeekDay cannot be empty';
  }

  const onWeekDayRegex = new RegExp(WEEKDAY_REGEX);
  const invalidDays: string[] = [];

  array.forEach((day) => {
    if (!onWeekDayRegex.test(day)) {
      invalidDays.push(day);
    }
  });

  if (invalidDays.length > 0) {
    return `Invalid onWeekDay values in recurring schedule: ${invalidDays.join(',')}`;
  }
};

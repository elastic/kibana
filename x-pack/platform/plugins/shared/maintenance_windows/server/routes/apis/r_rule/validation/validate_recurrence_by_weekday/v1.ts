/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const validateRecurrenceByWeekday = (array: string[]) => {
  if (array.length === 0) {
    return 'rRule byweekday cannot be empty';
  }

  const byWeekDayRegex = new RegExp('^(((\\+|-)[1-4])?(MO|TU|WE|TH|FR|SA|SU))$');
  const invalidDays: string[] = [];

  array.forEach((day) => {
    if (!byWeekDayRegex.test(day)) {
      invalidDays.push(day);
    }
  });

  if (invalidDays.length > 0) {
    return `invalid byweekday values in rRule byweekday: ${invalidDays.join(',')}`;
  }
};

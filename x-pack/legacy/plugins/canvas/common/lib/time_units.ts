/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum TimeUnit {
  SECONDS = 's',
  MINUTES = 'm',
  HOURS = 'h',
  DAYS = 'd',
  WEEKS = 'w',
  MONTHS = 'M',
  YEARS = 'y',
}

export const timeUnits: Record<TimeUnit, string> = {
  [TimeUnit.SECONDS]: 'second',
  [TimeUnit.MINUTES]: 'minute',
  [TimeUnit.HOURS]: 'hour',
  [TimeUnit.DAYS]: 'day',
  [TimeUnit.WEEKS]: 'week',
  [TimeUnit.MONTHS]: 'month',
  [TimeUnit.YEARS]: 'year',
};

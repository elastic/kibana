/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

const FULL_DATE = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatSnoozeDate = (dateStr: string): string => SHORT_DATE.format(new Date(dateStr));

export const formatSnoozeFullDate = (dateStr: string): string =>
  FULL_DATE.format(new Date(dateStr));

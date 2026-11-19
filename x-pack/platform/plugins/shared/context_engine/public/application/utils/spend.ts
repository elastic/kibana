/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const formatUsd = (amount: number): string =>
  new Intl.NumberFormat(i18n.getLocale(), { style: 'currency', currency: 'USD' }).format(amount);

export const formatTokens = (tokens: number): string =>
  new Intl.NumberFormat(i18n.getLocale(), { notation: 'compact' }).format(tokens);

/** Calendar date of the period start, which is a UTC month boundary. */
export const formatPeriodStart = (periodStart: string): string =>
  new Intl.DateTimeFormat(i18n.getLocale(), { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(periodStart)
  );

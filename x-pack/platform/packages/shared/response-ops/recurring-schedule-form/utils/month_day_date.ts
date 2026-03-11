/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';

export const monthDayDate = (date: Moment) => localDateWithoutYear(date, 'LL');

const localDateWithoutYear = (date: Moment, format: string) =>
  date
    .format(format)
    // We want to produce the local equivalent of DD MMM (e.g. MMM DD in US, China, Japan, Hungary, etc.)
    // but Moment doesn't let us format just DD MMM according to locale, only DD MM(,?) YYYY,
    // so regex replace the year and any commas from the LL formatted string
    .replace(new RegExp(`(${date.format('YYYY')}|,)`, 'g'), '')
    .trim();

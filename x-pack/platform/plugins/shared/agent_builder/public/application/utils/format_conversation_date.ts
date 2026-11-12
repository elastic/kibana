/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';

/** Formats a conversation date as month and day in the active locale, adding the year for dates outside the current year. */
export const formatConversationDate = (
  date: string,
  now: moment.Moment = moment(),
  locale: string = i18n.getLocale()
): string => {
  const value = moment(date);
  const options: Intl.DateTimeFormatOptions = value.isSame(now, 'year')
    ? { month: 'short', day: '2-digit' }
    : { month: 'short', day: '2-digit', year: 'numeric' };

  return new Intl.DateTimeFormat(locale, options).format(value.toDate());
};

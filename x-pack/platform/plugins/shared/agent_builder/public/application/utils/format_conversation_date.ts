/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';

/** Formats a conversation date as month and day in the active locale and Kibana time zone, adding the year for dates outside the current year. */
export const formatConversationDate = (
  date: string,
  now: moment.Moment = moment(),
  locale: string = i18n.getLocale()
): string => {
  const value = moment(date);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: '2-digit',
    ...(value.isSame(now, 'year') ? {} : { year: 'numeric' }),
    // Kibana sets `dateFormat:tz` as moment's default zone; undefined falls back to the browser zone.
    timeZone: value.tz(),
  };

  return new Intl.DateTimeFormat(locale, options).format(value.toDate());
};

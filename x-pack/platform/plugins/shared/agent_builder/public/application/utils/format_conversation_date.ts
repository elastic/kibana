/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

/** Formats a conversation date as month and day, adding the year for dates outside the current year. */
export const formatConversationDate = (date: string, now: moment.Moment = moment()): string => {
  const value = moment(date);
  return value.format(value.isSame(now, 'year') ? 'MMM DD' : 'MMM DD, YYYY');
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

export const validateTimezone = (timezone?: string) => {
  if (timezone && moment.tz.zone(timezone) == null) {
    return `Invalid schedule timezone: ${timezone}`;
  }
  return;
};

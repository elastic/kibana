/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import 'moment-timezone';

export function validateTimezone(timezone: string) {
  if (moment.tz.names().includes(timezone)) {
    return;
  }
  return 'string is not a valid timezone: ' + timezone;
}

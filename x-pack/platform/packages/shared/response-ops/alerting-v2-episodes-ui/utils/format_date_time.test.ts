/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { DEFAULT_DATE_FORMAT } from '../constants';
import { formatDateTime } from './format_date_time';

describe('formatDateTime', () => {
  it('formats an ISO datetime string with the default date format when none is provided', () => {
    const value = '2024-03-15T10:30:00Z';
    expect(formatDateTime(value)).toBe(moment(value).format(DEFAULT_DATE_FORMAT));
  });

  it('formats an ISO datetime string with the provided date format', () => {
    const value = '2024-03-15T10:30:00Z';
    const dateFormat = 'YYYY-MM-DD HH:mm:ss';
    expect(formatDateTime(value, dateFormat)).toBe(moment(value).format(dateFormat));
  });
});

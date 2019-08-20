/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';

import {
  formatHumanReadableDate,
  formatHumanReadableDateTime,
  formatHumanReadableDateTimeSeconds,
} from './date_utils';

describe('formatHumanReadableDate', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  test('formatHumanReadableDate', () => {
    const formattedDate = formatHumanReadableDate(0);
    expect(formattedDate).toBe('January 1st 1970');
  });
  test('formatHumanReadableDateTime', () => {
    const formattedDate = formatHumanReadableDateTime(0);
    expect(formattedDate).toBe('January 1st 1970, 00:00');
  });
  test('formatHumanReadableDateTimeSeconds', () => {
    const formattedDate = formatHumanReadableDateTimeSeconds(0);
    expect(formattedDate).toBe('January 1st 1970, 00:00:00');
  });
});

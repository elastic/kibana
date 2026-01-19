/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { getStartDateValidator } from './start_date_validator';
import { SCHEDULED_REPORT_FORM_START_DATE_TOO_EARLY_MESSAGE } from '../translations';

describe('getStartDateValidator', () => {
  const timezone = 'UTC';
  const today = moment.tz('2025-07-11T00:00:00Z', timezone);
  const validator = getStartDateValidator(today, timezone);

  it('returns error if value is before today', () => {
    const value = moment.tz('2025-07-10T23:59:59Z', timezone);
    const result = validator({ value } as any);
    expect(result).toEqual({ message: SCHEDULED_REPORT_FORM_START_DATE_TOO_EARLY_MESSAGE });
  });

  it('returns undefined if value is equal to today', () => {
    const value = moment.tz('2025-07-11T00:00:00Z', timezone);
    const result = validator({ value } as any);
    expect(result).toBeUndefined();
  });

  it('returns undefined if value is after today', () => {
    const value = moment.tz('2025-07-12T00:00:00Z', timezone);
    const result = validator({ value } as any);
    expect(result).toBeUndefined();
  });

  it('handles different timezones correctly', () => {
    const tz = 'America/New_York';
    const todayNY = moment.tz('2025-07-11T00:00:00', tz);
    const validatorNY = getStartDateValidator(todayNY, tz);
    const value = moment.tz('2025-07-10T23:59:59', tz);
    const result = validatorNY({ value } as any);
    expect(result).toEqual({ message: SCHEDULED_REPORT_FORM_START_DATE_TOO_EARLY_MESSAGE });
  });

  it('handles previous start date correctly', () => {
    const prevStartDate = '2025-07-10T00:00:00Z';
    const validatorWithPrev = getStartDateValidator(today, timezone, prevStartDate);
    const value = moment.tz('2025-07-10T00:00:00Z', timezone);
    const result = validatorWithPrev({ value } as any);
    expect(result).toBeUndefined();
  });

  it('throws error if value is different than previous start date and before today', () => {
    const prevStartDate = '2025-07-10T00:00:00Z';
    const validatorWithPrev = getStartDateValidator(today, timezone, prevStartDate);
    const value = moment.tz('2025-07-10T23:59:59Z', timezone);
    const result = validatorWithPrev({ value } as any);
    expect(result).toEqual({ message: SCHEDULED_REPORT_FORM_START_DATE_TOO_EARLY_MESSAGE });
  });

  it('does not throw error if value is different than previous start date but after today', () => {
    const prevStartDate = '2025-07-10T00:00:00Z';
    const validatorWithPrev = getStartDateValidator(today, timezone, prevStartDate);
    const value = moment.tz('2025-07-11T23:59:59Z', timezone);
    const result = validatorWithPrev({ value } as any);
    expect(result).toBeUndefined();
  });
});

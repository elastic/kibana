/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateStartDate } from './v1';

describe('validateStartDate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates end date correctly', () => {
    expect(validateStartDate('2025-02-17T05:05:00.000Z')).toBeUndefined();
  });

  it('validates end date correctly with offset', () => {
    expect(validateStartDate('2025-02-10T21:30:00.000+05:30')).toBeUndefined();
  });

  it('validates for a date without timezone correctly', () => {
    expect(validateStartDate('2025-01-02T00:00:00.000')).toBeUndefined();
  });

  it('throws error for invalid date', () => {
    expect(validateStartDate('invalid-date')).toEqual('Invalid snooze start date: invalid-date');
  });

  it('throws error when not ISO format', () => {
    expect(validateStartDate('Feb 18 2025')).toEqual(
      'Invalid start date format: Feb 18 2025. Use ISO 8601 YYYY-MM-DDTHH:mm:ss.sssZ'
    );
  });
});

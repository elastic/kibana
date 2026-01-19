/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateEndDate } from './v1';

describe('validateEndDate', () => {
  const mockCurrentDate = new Date('2025-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(mockCurrentDate);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('validates end date correctly', () => {
    expect(validateEndDate('2025-02-17T05:05:00.000Z')).toBeUndefined();
  });

  it('throws error for invalid date', () => {
    expect(validateEndDate('invalid-date')).toEqual('Invalid schedule end date: invalid-date');
  });

  it('throws error for past date', () => {
    const pastDate = '2024-12-31T23:59:59.999Z';
    expect(validateEndDate(pastDate)).toBe(
      `Invalid schedule end date as it is in the past: ${pastDate}`
    );
  });

  it('throws error when not ISO format', () => {
    expect(validateEndDate('Feb 18 2025')).toEqual(
      'Invalid end date format: Feb 18 2025. Use ISO 8601 YYYY-MM-DDTHH:mm:ss.sssZ'
    );
  });

  it('throws error when end date with time offset', () => {
    expect(validateEndDate('2025-02-10T21:30:00.000+05:30')).toEqual(
      'Invalid end date format: 2025-02-10T21:30:00.000+05:30. Use ISO 8601 YYYY-MM-DDTHH:mm:ss.sssZ'
    );
  });
});

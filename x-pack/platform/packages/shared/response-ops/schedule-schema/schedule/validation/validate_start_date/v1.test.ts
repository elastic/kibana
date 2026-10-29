/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateStartDate } from './v1';

describe('validateStartDate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates start date correctly', () => {
    expect(validateStartDate('2025-02-17T05:05:00.000Z')).toBeUndefined();
  });

  it('validates iso start date correctly', () => {
    expect(validateStartDate(new Date().toISOString())).toBeUndefined();
  });

  it('throws error for invalid date', () => {
    expect(validateStartDate('invalid-date')).toEqual('Invalid schedule start date: invalid-date');
  });

  it('throws error when not ISO format', () => {
    expect(validateStartDate('Feb 18 2025')).toEqual(
      'Invalid schedule start date format: Feb 18 2025. Use ISO 8601 YYYY-MM-DDTHH:mm:ss.sssZ'
    );
  });

  it('throws error for start date with offset', () => {
    expect(validateStartDate('2025-02-10T21:30:00.000+05:30')).toEqual(
      'Invalid schedule start date format: 2025-02-10T21:30:00.000+05:30. Use ISO 8601 YYYY-MM-DDTHH:mm:ss.sssZ'
    );
  });
});

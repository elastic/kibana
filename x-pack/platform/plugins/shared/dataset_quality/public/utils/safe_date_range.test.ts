/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mock @kbn/timerange module
const mockGetDateISORange = jest.fn();

jest.mock('@kbn/timerange', () => ({
  getDateISORange: (...args: unknown[]) => mockGetDateISORange(...args),
}));

// Import after mocking
import { getSafeDateISORange } from './safe_date_range';

describe('getSafeDateISORange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return date range when getDateISORange succeeds', () => {
    const mockDateRange = {
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-02T00:00:00.000Z',
    };

    mockGetDateISORange.mockReturnValue(mockDateRange);

    const result = getSafeDateISORange({ from: 'now-1d', to: 'now' });

    expect(result).toEqual(mockDateRange);
  });

  it('should return undefined when getDateISORange throws (start > end)', () => {
    mockGetDateISORange.mockImplementation(() => {
      throw new Error('Invalid Dates: from: now-51s, to: 2024-01-01T00:00:00.000Z');
    });

    const result = getSafeDateISORange({
      from: 'now-51s',
      to: '2024-01-01T00:00:00.000Z',
    });

    expect(result).toBeUndefined();
  });

  it('should return undefined when getDateISORange throws due to invalid date strings', () => {
    mockGetDateISORange.mockImplementation(() => {
      throw new Error('Invalid Dates: from: invalid, to: also-invalid');
    });

    const result = getSafeDateISORange({
      from: 'invalid',
      to: 'also-invalid',
    });

    expect(result).toBeUndefined();
  });
});

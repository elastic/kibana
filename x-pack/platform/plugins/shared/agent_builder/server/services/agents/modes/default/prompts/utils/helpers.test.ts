/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { formatDate } from './helpers';

describe('formatDate', () => {
  it('should format the current date when no argument is provided', () => {
    const result = formatDate();

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(moment(result).isValid()).toBe(true);
  });

  it('should format dates correctly and remove milliseconds', () => {
    const testCases = [
      { input: '2024-01-15T10:30:45.123Z', expected: '2024-01-15T10:30:45Z' },
      { input: '2024-06-20T14:45:30.456Z', expected: '2024-06-20T14:45:30Z' },
      { input: '2023-12-25T00:00:00.000Z', expected: '2023-12-25T00:00:00Z' },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = formatDate(new Date(input));
      expect(result).toBe(expected);
    });
  });
});

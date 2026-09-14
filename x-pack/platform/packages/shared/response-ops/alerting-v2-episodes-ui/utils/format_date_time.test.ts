/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDateTime } from './format_date_time';

describe('formatDateTime', () => {
  it('formats an ISO datetime string with the default date format when none is provided', () => {
    expect(formatDateTime('2024-03-15T10:30:00')).toBe('Mar 15, 2024 @ 10:30:00.000');
  });

  it('formats an ISO datetime string with the provided date format', () => {
    expect(formatDateTime('2024-03-15T10:30:00', 'YYYY-MM-DD HH:mm:ss')).toBe(
      '2024-03-15 10:30:00'
    );
  });
});

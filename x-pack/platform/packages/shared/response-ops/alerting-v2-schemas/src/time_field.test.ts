/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_TIME_FIELD, resolveTimeField } from './time_field';

describe('resolveTimeField', () => {
  it('keeps the current time field when it exists on the index', () => {
    expect(
      resolveTimeField({ dateFields: ['@timestamp', 'timestamp'], currentTimeField: 'timestamp' })
    ).toBe('timestamp');
  });

  it('prefers @timestamp when present and the current field is invalid', () => {
    expect(
      resolveTimeField({ dateFields: ['event.start', '@timestamp'], currentTimeField: 'unknown' })
    ).toBe(DEFAULT_TIME_FIELD);
  });

  it('falls back to the first date field when @timestamp is absent', () => {
    // kibana_sample_data_flights only has `timestamp` (rna-program#613).
    expect(resolveTimeField({ dateFields: ['timestamp'], currentTimeField: '@timestamp' })).toBe(
      'timestamp'
    );
  });

  it('sorts date fields for deterministic selection', () => {
    expect(resolveTimeField({ dateFields: ['event.end', 'event.start'] })).toBe('event.end');
  });

  it('deduplicates date fields', () => {
    expect(resolveTimeField({ dateFields: ['timestamp', 'timestamp'] })).toBe('timestamp');
  });

  it('ignores empty field names', () => {
    expect(resolveTimeField({ dateFields: ['', 'timestamp'] })).toBe('timestamp');
  });

  it('defaults to @timestamp when no date fields are known', () => {
    expect(resolveTimeField({ dateFields: [], currentTimeField: 'event.start' })).toBe(
      DEFAULT_TIME_FIELD
    );
  });

  it('defaults to @timestamp when no date fields and no current field are provided', () => {
    expect(resolveTimeField({ dateFields: [] })).toBe(DEFAULT_TIME_FIELD);
  });
});

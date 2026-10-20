/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_TIME_FIELD } from '@kbn/alerting-v2-constants';
import { resolveTimeField } from './time_field';

describe('resolveTimeField', () => {
  it('keeps the current time field when it exists on the index', () => {
    expect(
      resolveTimeField({ dateFields: ['@timestamp', 'timestamp'], currentTimeField: 'timestamp' })
    ).toBe('timestamp');
  });

  it('returns null when the current field is not on the index, even if @timestamp exists', () => {
    expect(
      resolveTimeField({ dateFields: ['event.start', '@timestamp'], currentTimeField: 'unknown' })
    ).toBeNull();
  });

  it('returns null when the current field is @timestamp but the index does not have it', () => {
    // kibana_sample_data_flights only has `timestamp`.
    expect(
      resolveTimeField({ dateFields: ['timestamp'], currentTimeField: '@timestamp' })
    ).toBeNull();
  });

  it('prefers @timestamp when no field is selected', () => {
    expect(resolveTimeField({ dateFields: ['event.start', '@timestamp'] })).toBe(
      DEFAULT_TIME_FIELD
    );
  });

  it('falls back to the first date field when @timestamp is absent and no field is selected', () => {
    expect(resolveTimeField({ dateFields: ['timestamp'] })).toBe('timestamp');
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

  it('returns null when no date fields are known (does not fabricate @timestamp)', () => {
    expect(resolveTimeField({ dateFields: [], currentTimeField: 'event.start' })).toBeNull();
  });

  it('returns null when no date fields and no current field are provided', () => {
    expect(resolveTimeField({ dateFields: [] })).toBeNull();
  });

  it('auto-picks a default for an empty selection (treats `` as "no selection")', () => {
    // An empty string means the value was cleared after failing to resolve. It is
    // treated as "no selection" and auto-picks a default rather than staying blank.
    expect(
      resolveTimeField({ dateFields: ['@timestamp', 'timestamp'], currentTimeField: '' })
    ).toBe(DEFAULT_TIME_FIELD);
  });

  it('auto-picks the first date field for an empty selection when @timestamp is absent', () => {
    expect(
      resolveTimeField({ dateFields: ['event.end', 'event.start'], currentTimeField: '' })
    ).toBe('event.end');
  });
});

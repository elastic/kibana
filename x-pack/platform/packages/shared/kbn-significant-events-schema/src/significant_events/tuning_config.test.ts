/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  SIGNIFICANT_EVENTS_TUNING_FIELD_BOUNDS,
  resolveSignificantEventsTuningConfig,
  validateSignificantEventsTuningConfig,
} from './tuning_config';

// These generic validator tests only need *some* bounded tuning field to exercise the
// number / integer / range checks. Derive one from the bounds map so they never need
// updating when individual fields (such as the former `sample_size`) are added or removed.
const integerFieldEntry = Object.entries(SIGNIFICANT_EVENTS_TUNING_FIELD_BOUNDS).find(
  ([, bounds]) => bounds.integer === true && typeof bounds.max === 'number'
);
if (!integerFieldEntry) {
  throw new Error('Expected an integer-bounded tuning field with a max to drive these tests');
}
const [INTEGER_FIELD, integerFieldBounds] = integerFieldEntry;
const { min: FIELD_MIN, max: FIELD_MAX } = integerFieldBounds;
if (typeof FIELD_MAX !== 'number') {
  throw new Error('Expected the derived tuning field to have a numeric max');
}
const VALID_OVERRIDE = FIELD_MIN + 1;

describe('validateSignificantEventsTuningConfig', () => {
  it('returns no errors for a valid config', () => {
    expect(validateSignificantEventsTuningConfig(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG)).toEqual(
      []
    );
  });

  it('returns no errors for an empty config (all defaults)', () => {
    expect(validateSignificantEventsTuningConfig({})).toEqual([]);
  });

  it('reports unknown keys', () => {
    const errors = validateSignificantEventsTuningConfig({ unknown_key: 42 });
    expect(errors).toEqual(['Unknown key: "unknown_key"']);
  });

  it('reports non-number values', () => {
    const errors = validateSignificantEventsTuningConfig({ [INTEGER_FIELD]: 'abc' });
    expect(errors).toEqual([`"${INTEGER_FIELD}" must be a number, got string`]);
  });

  it('reports NaN values', () => {
    const errors = validateSignificantEventsTuningConfig({
      entity_filtered_ratio: NaN,
      diverse_ratio: NaN,
      semantic_min_score: NaN,
    });
    expect(errors).toEqual([
      '"entity_filtered_ratio" must be a number, got NaN',
      '"diverse_ratio" must be a number, got NaN',
      '"semantic_min_score" must be a number, got NaN',
    ]);
  });

  it('reports NaN for integer fields', () => {
    const errors = validateSignificantEventsTuningConfig({ [INTEGER_FIELD]: NaN });
    expect(errors).toEqual([`"${INTEGER_FIELD}" must be a number, got NaN`]);
  });

  it('reports non-integer values for integer fields', () => {
    const errors = validateSignificantEventsTuningConfig({ [INTEGER_FIELD]: FIELD_MIN + 0.5 });
    expect(errors).toEqual([`"${INTEGER_FIELD}" must be an integer`]);
  });

  it('reports out-of-bounds values', () => {
    const errors = validateSignificantEventsTuningConfig({ [INTEGER_FIELD]: FIELD_MAX + 1 });
    expect(errors).toEqual([`"${INTEGER_FIELD}" must be between ${FIELD_MIN} and ${FIELD_MAX}`]);
  });

  it('reports cross-field ratio violation', () => {
    const errors = validateSignificantEventsTuningConfig({
      entity_filtered_ratio: 0.7,
      diverse_ratio: 0.5,
    });
    expect(errors).toContainEqual(
      expect.stringContaining('entity_filtered_ratio (0.7) + diverse_ratio (0.5) must be <= 1.0')
    );
  });
});

describe('resolveSignificantEventsTuningConfig', () => {
  it('merges stored values over defaults for missing keys', () => {
    expect(resolveSignificantEventsTuningConfig({ [INTEGER_FIELD]: VALID_OVERRIDE })).toEqual({
      ...DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
      [INTEGER_FIELD]: VALID_OVERRIDE,
    });
  });

  it('drops unknown keys without falling back to defaults', () => {
    const logger = { warn: jest.fn() };
    const result = resolveSignificantEventsTuningConfig(
      // `sample_size` was a tuning key before it moved into the features identification workflow.
      { [INTEGER_FIELD]: VALID_OVERRIDE, sample_size: 30, legacy_field: 99 },
      logger
    );
    expect(result).toEqual({
      ...DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
      [INTEGER_FIELD]: VALID_OVERRIDE,
    });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('falls back to full defaults and warns on an out-of-bounds value', () => {
    const logger = { warn: jest.fn() };
    const result = resolveSignificantEventsTuningConfig({ [INTEGER_FIELD]: FIELD_MAX + 1 }, logger);
    expect(result).toEqual(DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid'));
  });

  it('resets a legacy 0-100 semantic_min_score and warns', () => {
    const logger = { warn: jest.fn() };
    const result = resolveSignificantEventsTuningConfig({ semantic_min_score: 75 }, logger);
    expect(result.semantic_min_score).toBe(
      DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.semantic_min_score
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('semantic_min_score'));
  });

  it('returns defaults for null or non-object input', () => {
    expect(resolveSignificantEventsTuningConfig(null)).toEqual(
      DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG
    );
    expect(resolveSignificantEventsTuningConfig('nonsense')).toEqual(
      DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  evaluateTotalFieldsLimit,
  getIgnoreDynamicBeyondLimitFromSettings,
  getTotalFieldsLimitFromSettings,
  getTotalFieldsLimitSettings,
} from './total_fields_limit_settings';

describe('getTotalFieldsLimitFromSettings', () => {
  it('reads the limit from flat settings', () => {
    expect(getTotalFieldsLimitFromSettings({ 'index.mapping.total_fields.limit': '5000' })).toBe(
      5000
    );
  });

  it('reads the limit from nested settings', () => {
    expect(
      getTotalFieldsLimitFromSettings({ index: { mapping: { total_fields: { limit: '5000' } } } })
    ).toBe(5000);
  });

  it('reads the limit from settings without the index prefix', () => {
    expect(getTotalFieldsLimitFromSettings({ mapping: { total_fields: { limit: 5000 } } })).toBe(
      5000
    );
  });

  it('reads a numeric limit', () => {
    expect(getTotalFieldsLimitFromSettings({ 'index.mapping.total_fields.limit': 2500 })).toBe(
      2500
    );
  });

  it('returns undefined when the limit is not set', () => {
    expect(getTotalFieldsLimitFromSettings({ hidden: true })).toBeUndefined();
    expect(getTotalFieldsLimitFromSettings(undefined)).toBeUndefined();
  });

  it('returns undefined when the limit is not a number', () => {
    expect(
      getTotalFieldsLimitFromSettings({ 'index.mapping.total_fields.limit': 'not-a-number' })
    ).toBeUndefined();
  });
});

describe('getIgnoreDynamicBeyondLimitFromSettings', () => {
  it('reads the flag from flat settings', () => {
    expect(
      getIgnoreDynamicBeyondLimitFromSettings({
        'index.mapping.total_fields.ignore_dynamic_beyond_limit': 'true',
      })
    ).toBe(true);
  });

  it('reads a boolean flag from nested settings', () => {
    expect(
      getIgnoreDynamicBeyondLimitFromSettings({
        index: { mapping: { total_fields: { ignore_dynamic_beyond_limit: true } } },
      })
    ).toBe(true);
  });

  it('returns false for a false flag', () => {
    expect(
      getIgnoreDynamicBeyondLimitFromSettings({
        'index.mapping.total_fields.ignore_dynamic_beyond_limit': 'false',
      })
    ).toBe(false);
  });

  it('returns undefined when the flag is not set', () => {
    expect(getIgnoreDynamicBeyondLimitFromSettings({ hidden: true })).toBeUndefined();
    expect(getIgnoreDynamicBeyondLimitFromSettings(undefined)).toBeUndefined();
  });
});

describe('getTotalFieldsLimitSettings', () => {
  it('builds the settings pair', () => {
    expect(getTotalFieldsLimitSettings(2800)).toEqual({
      'index.mapping.total_fields.limit': 2800,
      'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
    });
  });
});

describe('evaluateTotalFieldsLimit', () => {
  const settingsWith = (limit: number | string, flag?: boolean | string) => ({
    'index.mapping.total_fields.limit': limit,
    ...(flag !== undefined
      ? { 'index.mapping.total_fields.ignore_dynamic_beyond_limit': flag }
      : {}),
  });

  it('is satisfied when all settings have a limit >= requested and the flag set', () => {
    expect(
      evaluateTotalFieldsLimit([settingsWith('5000', 'true'), settingsWith(2800, true)], 2800)
    ).toEqual({ isSatisfied: true, effectiveLimit: 5000 });
  });

  it('is not satisfied when any limit is below the requested value', () => {
    expect(
      evaluateTotalFieldsLimit([settingsWith('5000', 'true'), settingsWith(2000, true)], 2800)
    ).toEqual({ isSatisfied: false, effectiveLimit: 5000 });
  });

  it('is not satisfied when the flag is missing, but preserves a higher limit', () => {
    expect(evaluateTotalFieldsLimit([settingsWith('5000')], 2800)).toEqual({
      isSatisfied: false,
      effectiveLimit: 5000,
    });
  });

  it('is not satisfied when a settings object has no limit', () => {
    expect(evaluateTotalFieldsLimit([{ hidden: true }], 2800)).toEqual({
      isSatisfied: false,
      effectiveLimit: 2800,
    });
    expect(evaluateTotalFieldsLimit([undefined], 2800)).toEqual({
      isSatisfied: false,
      effectiveLimit: 2800,
    });
  });

  it('is not satisfied for an empty settings list', () => {
    expect(evaluateTotalFieldsLimit([], 2800)).toEqual({
      isSatisfied: false,
      effectiveLimit: 2800,
    });
  });

  it('never returns an effective limit below the requested value', () => {
    expect(evaluateTotalFieldsLimit([settingsWith(1000, true)], 2800).effectiveLimit).toBe(2800);
  });
});

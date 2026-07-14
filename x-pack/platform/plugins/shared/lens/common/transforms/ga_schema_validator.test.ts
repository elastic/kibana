/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findInvalidDurationFormat, toLegacyDurationUnits } from './ga_schema_validator';

describe('findInvalidDurationFormat', () => {
  it('accepts GA units and rejects legacy units when GA schemas are active', () => {
    const gaFormat = { type: 'duration', from: 'min', to: 'auto-approximate' };
    const legacyFormat = { type: 'duration', from: 'm', to: 'humanize' };

    expect(findInvalidDurationFormat(gaFormat, true)).toBeUndefined();
    expect(findInvalidDurationFormat(legacyFormat, true)).toEqual(expect.any(String));
  });

  it('accepts any unit names when GA schemas are disabled (legacy is permissive)', () => {
    const gaFormat = { type: 'duration', from: 'min', to: 'auto-approximate' };
    const legacyFormat = { type: 'duration', from: 'm', to: 'humanize' };
    const arbitraryFormat = { type: 'duration', from: 'minutes', to: 'anything' };

    // The legacy schema validates units as free-form strings, so nothing is rejected.
    expect(findInvalidDurationFormat(legacyFormat, false)).toBeUndefined();
    expect(findInvalidDurationFormat(gaFormat, false)).toBeUndefined();
    expect(findInvalidDurationFormat(arbitraryFormat, false)).toBeUndefined();
  });

  it('walks nested objects and arrays', () => {
    const value = {
      layers: [{ metrics: [{ format: { type: 'duration', from: 'm', to: 'humanize' } }] }],
    };

    expect(findInvalidDurationFormat(value, true)).toEqual(expect.any(String));
  });
});

describe('toLegacyDurationUnits', () => {
  it('rewrites GA input unit `min` to `minutes`', () => {
    expect(toLegacyDurationUnits({ type: 'duration', from: 'min', to: 's' })).toEqual({
      type: 'duration',
      from: 'minutes',
      to: 'asSeconds',
    });
  });

  it('rewrites GA output strategies to their legacy field-format names', () => {
    expect(toLegacyDurationUnits({ type: 'duration', from: 's', to: 'auto' })).toEqual({
      type: 'duration',
      from: 'seconds',
      to: 'humanizePrecise',
    });
    expect(toLegacyDurationUnits({ type: 'duration', from: 's', to: 'auto-approximate' })).toEqual({
      type: 'duration',
      from: 'seconds',
      to: 'humanize',
    });
  });

  it('rewrites GA fixed output unit `min` to `asMinutes`', () => {
    expect(toLegacyDurationUnits({ type: 'duration', from: 'min', to: 'min' })).toEqual({
      type: 'duration',
      from: 'minutes',
      to: 'asMinutes',
    });
  });

  it('rewrites all GA short-form units to legacy field-format names', () => {
    const format = { type: 'duration', from: 'us', to: 'ms', suffix: ' elapsed' };
    expect(toLegacyDurationUnits(format)).toEqual({
      type: 'duration',
      from: 'microseconds',
      to: 'asMilliseconds',
      suffix: ' elapsed',
    });
  });

  it('converts duration units nested in objects and arrays', () => {
    const value = {
      type: 'metric',
      layers: [
        {
          metrics: [
            { format: { type: 'duration', from: 'min', to: 'auto' } },
            { format: { type: 'number', decimals: 2 } },
          ],
        },
      ],
    };

    expect(toLegacyDurationUnits(value)).toEqual({
      type: 'metric',
      layers: [
        {
          metrics: [
            { format: { type: 'duration', from: 'minutes', to: 'humanizePrecise' } },
            { format: { type: 'number', decimals: 2 } },
          ],
        },
      ],
    });
  });

  it('leaves non-duration values unchanged', () => {
    expect(toLegacyDurationUnits({ type: 'number', decimals: 2 })).toEqual({
      type: 'number',
      decimals: 2,
    });
    expect(toLegacyDurationUnits('min')).toBe('min');
    expect(toLegacyDurationUnits(null)).toBeNull();
    expect(toLegacyDurationUnits(undefined)).toBeUndefined();
  });

  it('does not mutate the input value', () => {
    const input = { type: 'duration', from: 'min', to: 'auto' };
    const output = toLegacyDurationUnits(input);

    expect(input).toEqual({ type: 'duration', from: 'min', to: 'auto' });
    expect(output).not.toBe(input);
  });
});

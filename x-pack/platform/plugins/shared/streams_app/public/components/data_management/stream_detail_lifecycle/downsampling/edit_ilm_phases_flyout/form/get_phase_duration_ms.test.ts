/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPhaseDurationMs } from './get_phase_duration_ms';

const createForm = (values: Record<string, unknown>) => {
  const fields = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, { value: v }]));
  return {
    getFields: () => fields,
  };
};

describe('edit_ilm_phases_flyout/form/get_phase_duration_ms', () => {
  it('returns null when the phase is not enabled', () => {
    const form = createForm({
      '_meta.warm.enabled': false,
      '_meta.warm.minAgeValue': '30',
      '_meta.warm.minAgeUnit': 'd',
    });

    expect(
      getPhaseDurationMs(form, 'warm', {
        valuePathSuffix: 'minAgeValue',
        unitPathSuffix: 'minAgeUnit',
      })
    ).toBeNull();
  });

  it('returns null when extraEnabledPathSuffix is provided but disabled', () => {
    const form = createForm({
      '_meta.warm.enabled': true,
      '_meta.warm.downsampleEnabled': false,
      '_meta.warm.downsample.fixedIntervalValue': '1',
      '_meta.warm.downsample.fixedIntervalUnit': 'd',
    });

    expect(
      getPhaseDurationMs(form, 'warm', {
        valuePathSuffix: 'downsample.fixedIntervalValue',
        unitPathSuffix: 'downsample.fixedIntervalUnit',
        extraEnabledPathSuffix: 'downsampleEnabled',
      })
    ).toBeNull();
  });

  it('returns null when value is empty', () => {
    const form = createForm({
      '_meta.warm.enabled': true,
      '_meta.warm.minAgeValue': '   ',
      '_meta.warm.minAgeUnit': 'd',
    });

    expect(
      getPhaseDurationMs(form, 'warm', {
        valuePathSuffix: 'minAgeValue',
        unitPathSuffix: 'minAgeUnit',
      })
    ).toBeNull();
  });

  it('returns null when the value cannot be converted to milliseconds', () => {
    const form = createForm({
      '_meta.warm.enabled': true,
      '_meta.warm.minAgeValue': 'abc',
      '_meta.warm.minAgeUnit': 'd',
    });

    expect(
      getPhaseDurationMs(form, 'warm', {
        valuePathSuffix: 'minAgeValue',
        unitPathSuffix: 'minAgeUnit',
      })
    ).toBeNull();
  });

  it('returns null for negative durations', () => {
    const form = createForm({
      '_meta.warm.enabled': true,
      '_meta.warm.minAgeValue': '-1',
      '_meta.warm.minAgeUnit': 'd',
    });

    expect(
      getPhaseDurationMs(form, 'warm', {
        valuePathSuffix: 'minAgeValue',
        unitPathSuffix: 'minAgeUnit',
      })
    ).toBeNull();
  });

  it('returns milliseconds for valid value+unit', () => {
    const form = createForm({
      '_meta.warm.enabled': true,
      '_meta.warm.minAgeValue': '2',
      '_meta.warm.minAgeUnit': 'h',
    });

    expect(
      getPhaseDurationMs(form, 'warm', {
        valuePathSuffix: 'minAgeValue',
        unitPathSuffix: 'minAgeUnit',
      })
    ).toBe(7_200_000);
  });

  it('defaults unit to days when unit field is missing', () => {
    const form = createForm({
      '_meta.warm.enabled': true,
      '_meta.warm.minAgeValue': '2',
    });

    expect(
      getPhaseDurationMs(form, 'warm', {
        valuePathSuffix: 'minAgeValue',
        unitPathSuffix: 'minAgeUnit',
      })
    ).toBe(172_800_000);
  });
});

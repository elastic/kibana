/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deriveDiagnoseAvailability,
  effectiveDiagnoseState,
  type DiagnoseState,
} from './derive_diagnose_availability';

describe('deriveDiagnoseAvailability', () => {
  const ready = { hasRequiredLicense: true, hasLlmConnector: true };

  it('returns A when Agent Builder is present, allowed, licensed, and has an LLM connector', () => {
    expect(
      deriveDiagnoseAvailability({ pluginPresent: true, hasShowPrivilege: true, access: ready })
    ).toBe('a');
  });

  it('returns B when licensed but no LLM connector is configured', () => {
    expect(
      deriveDiagnoseAvailability({
        pluginPresent: true,
        hasShowPrivilege: true,
        access: { hasRequiredLicense: true, hasLlmConnector: false },
      })
    ).toBe('b');
  });

  it('returns C when the license is insufficient, regardless of the LLM connector', () => {
    expect(
      deriveDiagnoseAvailability({
        pluginPresent: true,
        hasShowPrivilege: true,
        access: { hasRequiredLicense: false, hasLlmConnector: true },
      })
    ).toBe('c');
  });

  it.each([
    ['the plugin is missing', { pluginPresent: false, hasShowPrivilege: true, access: ready }],
    [
      'the user lacks the show privilege',
      { pluginPresent: true, hasShowPrivilege: false, access: ready },
    ],
    [
      'access detection is loading or failed',
      { pluginPresent: true, hasShowPrivilege: true, access: null },
    ],
  ])('returns D when %s', (_, input) => {
    expect(deriveDiagnoseAvailability(input)).toBe('d');
  });
});

describe('effectiveDiagnoseState', () => {
  it.each<[DiagnoseState, boolean, DiagnoseState]>([
    ['a', true, 'a'],
    ['b', true, 'b'],
    ['c', true, 'c'],
    ['d', true, 'd'],
    ['a', false, 'd'],
    ['b', false, 'd'],
    ['c', false, 'c'],
    ['d', false, 'd'],
  ])('maps %s with the feature enabled=%s to %s', (state, enabled, expected) => {
    expect(effectiveDiagnoseState(state, enabled)).toBe(expected);
  });
});

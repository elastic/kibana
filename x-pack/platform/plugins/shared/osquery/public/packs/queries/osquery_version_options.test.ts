/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOsqueryVersionOptions, isLiveOsqueryVersion } from './osquery_version_options';
import { FALLBACK_OSQUERY_VERSION } from '../../../common/constants';

describe('getOsqueryVersionOptions', () => {
  it('lists the live version then every <major>.<minor>.0 down to 5.0.0 (5.23.1)', () => {
    const labels = getOsqueryVersionOptions('5.23.1').map((o) => o.label);
    const expected = ['5.23.1'];
    for (let m = 23; m >= 0; m--) expected.push(`5.${m}.0`);
    expect(labels).toEqual(expected);
  });

  it('does not include 4.x entries for a live 5.x version', () => {
    const opts = getOsqueryVersionOptions('5.23.1');
    const has4x = opts.some((o) => o.label.startsWith('4.'));
    expect(has4x).toBe(false);
  });

  it('ends with 5.0.0', () => {
    const opts = getOsqueryVersionOptions('5.23.1');
    expect(opts[opts.length - 1].label).toBe('5.0.0');
  });

  it('dedupes when live version matches a generated entry (5.20.0)', () => {
    const opts = getOsqueryVersionOptions('5.20.0');
    const labels = opts.map((o) => o.label);
    expect(labels.filter((l) => l === '5.20.0')).toHaveLength(1);
    expect(labels[0]).toBe('5.20.0');
    expect(labels[1]).toBe('5.19.0');
  });

  it('handles a future major (6.2.0): includes 5.23.0..5.0.0 after 6.x entries', () => {
    const opts = getOsqueryVersionOptions('6.2.0');
    const labels = opts.map((o) => o.label);
    expect(labels[0]).toBe('6.2.0');
    expect(labels).toContain('6.1.0');
    expect(labels).toContain('6.0.0');
    expect(labels).toContain('5.23.0');
    expect(labels).toContain('5.0.0');
  });

  // Documents the maintenance contract: a major with no LAST_KNOWN_MINOR entry
  // collapses to `<major>.0.0`, so the table needs an entry once that major is
  // no longer the live one.
  it('lists only <major>.0.0 for an older major missing from LAST_KNOWN_MINOR (7.1.0)', () => {
    const labels = getOsqueryVersionOptions('7.1.0').map((o) => o.label);
    expect(labels.slice(0, 5)).toEqual(['7.1.0', '7.0.0', '6.0.0', '5.23.0', '5.22.0']);
    expect(labels).not.toContain('6.1.0');
  });

  it('falls back to FALLBACK_OSQUERY_VERSION on garbage input', () => {
    expect(getOsqueryVersionOptions('garbage')).toEqual(
      getOsqueryVersionOptions(FALLBACK_OSQUERY_VERSION)
    );
    expect(getOsqueryVersionOptions('garbage')[0].label).toBe(FALLBACK_OSQUERY_VERSION);
  });

  it('falls back when given a pre-5 version such as the integration version (1.35.0)', () => {
    expect(getOsqueryVersionOptions('1.35.0')).toEqual(
      getOsqueryVersionOptions(FALLBACK_OSQUERY_VERSION)
    );
  });

  it('sorts 5.10 above 5.9 (numeric order, not lexicographic)', () => {
    const opts = getOsqueryVersionOptions('5.23.1');
    const labels = opts.map((o) => o.label);
    const idx10 = labels.indexOf('5.10.0');
    const idx9 = labels.indexOf('5.9.0');
    expect(idx10).toBeLessThan(idx9);
  });
});

describe('isLiveOsqueryVersion', () => {
  it.each(['5.0.0', '5.23.1', '6.2.0'])('accepts %s', (v) => {
    expect(isLiveOsqueryVersion(v)).toBe(true);
  });

  it.each(['1.35.0', '4.9.0', '5.23', 'garbage', ''])('rejects %s', (v) => {
    expect(isLiveOsqueryVersion(v)).toBe(false);
  });
});

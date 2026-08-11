/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripPolicyIdVersionSuffix } from './strip_policy_id_version_suffix';

describe('stripPolicyIdVersionSuffix', () => {
  it('strips a trailing major.minor version suffix', () => {
    expect(stripPolicyIdVersionSuffix('policy-1#9.4')).toBe('policy-1');
  });

  it('strips a multi-digit minor version suffix', () => {
    expect(stripPolicyIdVersionSuffix('policy-1#9.10')).toBe('policy-1');
  });

  it('does not strip a patch-level suffix (not a Fleet version suffix)', () => {
    expect(stripPolicyIdVersionSuffix('policy-1#9.5.0')).toBe('policy-1#9.5.0');
  });

  it('leaves an id with no suffix untouched', () => {
    expect(stripPolicyIdVersionSuffix('policy-1')).toBe('policy-1');
  });

  it('leaves a custom id containing a non-version "#" suffix untouched', () => {
    expect(stripPolicyIdVersionSuffix('policy#123')).toBe('policy#123');
  });

  it('only strips the trailing version suffix when the id contains an earlier literal "#"', () => {
    expect(stripPolicyIdVersionSuffix('a#b#9.4')).toBe('a#b');
  });

  it('leaves an empty string untouched', () => {
    expect(stripPolicyIdVersionSuffix('')).toBe('');
  });
});

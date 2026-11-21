/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isConvertedProfile } from './profiles';
import type { BoostProfile } from './types';

const profile = (name: string, isBuiltin: boolean): BoostProfile => ({
  name,
  type: 'indices',
  is_builtin: isBuiltin,
  min_boost: 1,
  max_boost: 1,
  availability: 'base',
  prewarm: false,
  pinned: false,
});

describe('isConvertedProfile', () => {
  it('recognizes a builtin profile whose name starts with `_converted_`', () => {
    expect(isConvertedProfile(profile('_converted_indices', true))).toBe(true);
  });

  it('leaves out other builtin profiles', () => {
    expect(isConvertedProfile(profile('default_indices', true))).toBe(false);
  });

  it('leaves out custom profiles, whatever their name', () => {
    expect(isConvertedProfile(profile('_converted_indices', false))).toBe(false);
  });
});

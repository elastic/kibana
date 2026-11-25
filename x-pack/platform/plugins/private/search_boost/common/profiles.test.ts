/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLabeledProfileName, isManagedProfile } from './profiles';

describe('isManagedProfile', () => {
  it('recognizes builtin profiles', () => {
    expect(isManagedProfile({ is_builtin: true })).toBe(true);
    expect(isManagedProfile({ is_builtin: false })).toBe(false);
  });
});

describe('isLabeledProfileName', () => {
  it('recognizes the builtin profiles that have their own label', () => {
    expect(isLabeledProfileName('default_indices')).toBe(true);
    expect(isLabeledProfileName('data_streams_3d')).toBe(true);
  });

  it('leaves out converted and custom profile names', () => {
    expect(isLabeledProfileName('_converted_indices')).toBe(false);
    expect(isLabeledProfileName('catalog-fast')).toBe(false);
  });
});

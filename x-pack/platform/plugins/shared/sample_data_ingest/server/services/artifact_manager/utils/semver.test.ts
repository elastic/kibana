/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { latestVersion, majorMinor } from './semver';

describe('majorMinor', () => {
  it('returns the version in a {major.minor} format', () => {
    expect(majorMinor('9.17.5')).toEqual('9.17');
  });
  it('ignores qualifiers', () => {
    expect(majorMinor('10.42.9000-snap')).toEqual('10.42');
  });
  it('accepts {major.minor} format as input', () => {
    expect(majorMinor('8.16')).toEqual('8.16');
  });
});

describe('latestVersion', () => {
  it('returns the highest version from the list', () => {
    expect(latestVersion(['7.16.3', '8.1.4', '6.14.2'])).toEqual('8.1.4');
  });
  it('accepts versions in a {major.minor} format', () => {
    expect(latestVersion(['9.16', '9.3'])).toEqual('9.16');
  });
});

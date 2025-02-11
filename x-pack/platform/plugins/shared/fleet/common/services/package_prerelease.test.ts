/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPackageReleaseLabel, isPackagePrerelease } from './package_prerelease';

describe('isPackagePrerelease', () => {
  it('should return prerelease true for 0.1.0', () => {
    expect(isPackagePrerelease('0.1.0')).toBe(true);
  });

  it('should return prerelease false for 1.1.0', () => {
    expect(isPackagePrerelease('1.1.0')).toBe(false);
  });

  it('should return prerelease true for 1.0.0-preview', () => {
    expect(isPackagePrerelease('1.0.0-preview')).toBe(true);
  });

  it('should return prerelease true for 1.0.0-beta', () => {
    expect(isPackagePrerelease('1.0.0-beta')).toBe(true);
  });

  it('should return prerelease true for 1.0.0-rc', () => {
    expect(isPackagePrerelease('1.0.0-rc')).toBe(true);
  });

  it('should return prerelease true for 1.0.0-dev.0', () => {
    expect(isPackagePrerelease('1.0.0-dev.0')).toBe(true);
  });
});

describe('getPackageReleaseLabel', () => {
  it('should return preview for 0.1.0', () => {
    expect(getPackageReleaseLabel('0.1.0')).toEqual('preview');
  });

  it('should return ga for 1.1.0', () => {
    expect(getPackageReleaseLabel('1.1.0')).toEqual('ga');
  });

  it('should return preview for 1.0.0-preview1', () => {
    expect(getPackageReleaseLabel('1.0.0-preview1')).toEqual('preview');
  });

  it('should return beta for 1.0.0-beta', () => {
    expect(getPackageReleaseLabel('1.0.0-beta')).toEqual('beta');
  });

  it('should return rc for 1.0.0-rc', () => {
    expect(getPackageReleaseLabel('1.0.0-rc')).toEqual('rc');
  });

  it('should return beta for 1.0.0-dev.0', () => {
    expect(getPackageReleaseLabel('1.0.0-dev.0')).toBe('beta');
  });
});

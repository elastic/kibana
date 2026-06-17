/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpgradeType } from './upgrade_type';
import { versionService } from './version';
import semver, { SemVer } from 'semver';

describe('getUpgradeType', () => {
  let current: SemVer;
  beforeEach(() => {
    versionService.setup('8.0.0');
    current = versionService.getCurrentVersion();
  });
  it('returns null if the upgrade target version is the same as the current version', () => {
    const target = current.raw.toString();
    const result = getUpgradeType({ current, target });
    expect(result).toBeNull();
  });
  it("returns 'major' if the upgrade target version is the next major", () => {
    const target = semver.inc(current, 'major')?.toString()!;
    const result = getUpgradeType({ current, target });
    expect(result).toBe('major');
  });
  it("returns 'minor' if the upgrade target version is the next minor", () => {
    const target = semver.inc(current, 'minor')?.toString()!;
    const result = getUpgradeType({ current, target });
    expect(result).toBe('minor');
  });
  it('returns undefined if the upgrade target version is more than 1 major', () => {
    const target = new SemVer('10.0.0').raw.toString();
    const result = getUpgradeType({ current, target });
    expect(result).toBeUndefined();
  });
  it('returns undefined if the upgrade target version is less than the current version', () => {
    const target = new SemVer('7.0.0').raw.toString();
    const result = getUpgradeType({ current, target });
    expect(result).toBeUndefined();
  });
});

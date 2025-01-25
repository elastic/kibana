/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpgradeType } from './upgrade_type';
import { versionService } from './version';
import semver from 'semver';

describe('getUpgradeType', () => {
  beforeEach(() => {
    versionService.setup('8.0.0');
  });
  it('returns null if the upgrade target version is the same as the current version', () => {
    const current = versionService.getCurrentVersion();
    const target = current.raw.toString();
    const result = getUpgradeType({ current, target });
    expect(result).toBeNull();
  });
  it("returns 'major' if the upgrade target version is the next major", () => {
    const current = versionService.getCurrentVersion();
    const target = semver.inc(current, 'major')?.toString()!;
    const result = getUpgradeType({ current, target });
    expect(result).toBeNull();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semver, { SemVer } from 'semver';

export interface UpgradeTypeParams {
  current: SemVer;
  target: string;
}

/**
 * @param {SemVer} current kibana version
 * @param {string} target version to upgrade to, defaults to next major
 * @returns {semver.ReleaseType | null | undefined} null if same version, undefined if target version is out of bounds
 */
export const getUpgradeType = ({ current, target }: UpgradeTypeParams) => {
  const targetVersion = semver.coerce(target)!;
  const versionDiff = targetVersion.major - current.major;
  if (versionDiff > 1 || versionDiff < 0) {
    return;
  }
  return semver.diff(current, semver.coerce(target)!);
};

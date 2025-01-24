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
// returns null if the versions are the same
// returns releaseType: major, premajor, minor, preminor, patch, prepatch, or prerelease. We only care about major or minor
// returns undefined if target isn't supplied or version jump > 1
export const getUpgradeType = ({ current, target }: UpgradeTypeParams) => {
  const targetVersion = semver.coerce(target)!;
  if (targetVersion && targetVersion.major - current.major > 1) {
    return;
  }
  return semver.diff(current, semver.coerce(target)!);
};

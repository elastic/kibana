/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import semver, { SemVer } from 'semver';

// returns null if the versions are the same
// returns releaseType: major, premajor, minor, preminor, patch, prepatch, or prerelease. We only care about major or minor
// returns undefined if target isn't supplied
export interface UpgradeTypeParams {
  current: SemVer;
  target: string;
}

export const getUpgradeType = ({ current, target }: UpgradeTypeParams) => {
  return semver.diff(current, target); // returns null if current === target for no upgrade
};

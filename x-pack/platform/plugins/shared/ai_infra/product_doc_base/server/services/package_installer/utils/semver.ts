/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Semver from 'semver';

export const latestVersion = (versions: string[]): string => {
  let latest: string = versions[0];
  for (let i = 1; i < versions.length; i++) {
    const current = versions[i];
    if (Semver.gt(Semver.coerce(current)!, Semver.coerce(latest)!)) {
      latest = current;
    }
  }
  return latest;
};

export const majorMinor = (version: string): string => {
  const parsed = Semver.coerce(version);
  if (!parsed) {
    throw new Error(`Not a valid semver version: [${version}]`);
  }
  return `${parsed.major}.${parsed.minor}`;
};

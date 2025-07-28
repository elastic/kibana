/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Semver from 'semver';

export const latestVersion = (availableVersions: string[], kibanaVer?: string): string => {
  const kibanaSemver = kibanaVer ? Semver.coerce(kibanaVer) : undefined;
  let latest: string | undefined;

  for (const version of availableVersions) {
    const semver = Semver.coerce(version);
    if (!semver) continue;

    if (
      (!kibanaSemver || Semver.lte(semver, kibanaSemver)) &&
      (!latest || Semver.gt(semver, Semver.coerce(latest)!))
    ) {
      latest = version;
    }
  }

  return latest ?? availableVersions[0];
};

export const majorMinor = (version: string): string => {
  const parsed = Semver.coerce(version);
  if (!parsed) {
    throw new Error(`Not a valid semver version: [${version}]`);
  }
  return `${parsed.major}.${parsed.minor}`;
};

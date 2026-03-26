/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Semver from 'semver';

/**
 * @param availableVersions - List of available versions
 * @param kibanaVer - Kibana version
 * @returns The latest version from the list
 * If kibanaVer is provided, return the previous closest version available
 */
export const latestVersion = (availableVersions: string[], kibanaVer?: string): string => {
  const kibanaSemver = kibanaVer ? Semver.coerce(kibanaVer) : undefined;
  let latest: string | undefined;

  for (const version of availableVersions) {
    const semver = Semver.coerce(version);
    if (!semver) continue;

    if (
      // If a Kibana version is provided,
      // narrow to only available versions prior to that Kibana version
      (!kibanaSemver || Semver.lte(semver, kibanaSemver)) &&
      // Else, grab the newer version from the list
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

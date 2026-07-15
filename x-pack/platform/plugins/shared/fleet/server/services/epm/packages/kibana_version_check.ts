/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverMajor from 'semver/functions/major';
import semverMinor from 'semver/functions/minor';

/**
 * Packages can re-release the same asset id/version with different content across a Kibana
 * stack upgrade (elastic/detection-rules#5601), so once per Kibana major.minor bump we need to
 * force an overwrite of installed Kibana assets to pick up that drift (elastic/kibana#250550).
 */
export function isOutdatedKibanaVersion(
  installedKibanaVersion: string | undefined,
  currentKibanaVersion: string
): boolean {
  if (!installedKibanaVersion) {
    return true;
  }

  return (
    semverMajor(installedKibanaVersion) !== semverMajor(currentKibanaVersion) ||
    semverMinor(installedKibanaVersion) !== semverMinor(currentKibanaVersion)
  );
}

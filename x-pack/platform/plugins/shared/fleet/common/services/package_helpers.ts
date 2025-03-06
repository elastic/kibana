/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';

import type { PackageInfo, PackagePolicy } from '../types';

/**
 * Return true if a package need Elastic Agent to be run as root/administrator
 */
export function isRootPrivilegesRequired(packageInfo: PackageInfo) {
  return (
    packageInfo.agent?.privileges?.root ||
    packageInfo.data_streams?.some((d) => d.agent?.privileges?.root)
  );
}

export function getRootPrivilegedDataStreams(
  packageInfo: PackageInfo
): Array<{ name: string; title: string }> {
  if (packageInfo.agent?.privileges?.root) {
    return [];
  }
  return (
    packageInfo.data_streams
      ?.filter((d) => d.agent?.privileges?.root)
      .map((ds) => ({ name: ds.name, title: ds.title })) ?? []
  );
}

export function getRootIntegrations(
  packagePolicies: PackagePolicy[]
): Array<{ name: string; title: string }> {
  return uniqBy(
    packagePolicies
      .map((policy) => policy.package)
      .filter((pkg) => (pkg && pkg.requires_root) || false),
    (pkg) => pkg!.name
  ).map((pkg) => ({ name: pkg!.name, title: pkg!.title }));
}

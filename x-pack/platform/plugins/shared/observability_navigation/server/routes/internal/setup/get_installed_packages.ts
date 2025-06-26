/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { PackageClient } from '@kbn/fleet-plugin/server';
import { hasData } from './has_data';

export async function getInstalledPackages({
  packageClient,
  scopedClusterClient,
  ensureInstalled = false,
}: {
  packageClient: PackageClient;
  scopedClusterClient: IScopedClusterClient;
  ensureInstalled?: boolean;
}) {
  if (ensureInstalled) {
    const hasOtelData = await hasData({ scopedClusterClient });

    if (hasOtelData) {
      await packageClient.ensureInstalledPackage({ pkgName: 'kubernetes_otel' });
    }
  }

  return Promise.all([
    packageClient.getInstallation('kubernetes'),
    packageClient.getInstallation('kubernetes_otel'),
  ]);
}

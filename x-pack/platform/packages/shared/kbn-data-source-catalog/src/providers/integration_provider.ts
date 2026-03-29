/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationMetadata } from '../types';

interface InstalledPackagesResponse {
  items: InstalledPackage[];
  total: number;
}

export interface PackageClientLike {
  getInstalledPackages(params?: { perPage?: number; page?: number }): Promise<InstalledPackagesResponse>;
}

interface InstalledPackage {
  name: string;
  version: string;
  title?: string;
  description?: string;
  status: string;
  dataStreams: Array<{
    name: string;
    title: string;
  }>;
  icons?: Array<{ src: string; type?: string }>;
}

function extractDataset(dataStreamName: string): string {
  const withoutWildcard = dataStreamName.replace(/-\*$/, '');
  const firstDash = withoutWildcard.indexOf('-');
  return firstDash >= 0 ? withoutWildcard.slice(firstDash + 1) : withoutWildcard;
}

export async function fetchIntegrationMetadata(
  packageClient: PackageClientLike
): Promise<Map<string, IntegrationMetadata>> {
  const response = await packageClient.getInstalledPackages({ perPage: 1000 });
  const result = new Map<string, IntegrationMetadata>();

  for (const pkg of response.items) {
    for (const ds of pkg.dataStreams) {
      result.set(ds.name, {
        package_name: pkg.name,
        package_title: pkg.title ?? pkg.name,
        package_version: pkg.version,
        dataset: extractDataset(ds.name),
        description: pkg.description ?? '',
        data_stream_title: ds.title,
        icons: pkg.icons,
      });
    }
  }

  return result;
}

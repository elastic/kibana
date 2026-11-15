/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const API_VERSION_HEADER = { 'elastic-api-version': '2023-10-31' };

// The test packages of the Fleet API integration tests. Some are copies of packages of the registry
// with an agent version condition added, which the packages of the registry do not have (yet).
const TEST_PACKAGES_DIR = path.resolve(
  __dirname,
  '../../../../../../../test/fleet_api_integration/apis/fixtures/test_packages'
);

interface KbnClientLike {
  request: <T>(options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
  }) => Promise<{ data: T }>;
}

export interface UploadedTestPackage {
  name: string;
  version: string;
  /** Uninstalls the package. The package policies of the package have to be deleted first. */
  uninstall: () => Promise<void>;
}

/**
 * Uploads a package of the Fleet API integration tests, so a test can use its agent version
 * conditions. A package cannot be uploaded under the name of a package of the registry, so it gets
 * the prefix `scout_`.
 */
export const uploadTestPackage = async (
  kbnClient: KbnClientLike,
  packageName: string,
  packageVersion: string
): Promise<UploadedTestPackage> => {
  const uploadName = `scout_${packageName}`;
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-fleet-package-'));
  try {
    const packageDir = path.join(workDir, `${uploadName}-${packageVersion}`);
    await fs.cp(path.join(TEST_PACKAGES_DIR, packageName, packageVersion), packageDir, {
      recursive: true,
    });
    const manifestPath = path.join(packageDir, 'manifest.yml');
    const manifest = await fs.readFile(manifestPath, 'utf8');
    await fs.writeFile(manifestPath, manifest.replace(/^name:.*$/m, `name: ${uploadName}`));

    const { stdout: archive } = await execa(
      'tar',
      ['-czf', '-', '-C', workDir, `${uploadName}-${packageVersion}`],
      { encoding: null }
    );

    await kbnClient.request({
      method: 'POST',
      path: '/api/fleet/epm/packages',
      headers: { ...API_VERSION_HEADER, 'content-type': 'application/gzip' },
      body: archive,
    });
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }

  return {
    name: uploadName,
    version: packageVersion,
    uninstall: async () => {
      await kbnClient.request({
        method: 'DELETE',
        path: `/api/fleet/epm/packages/${uploadName}/${packageVersion}`,
        headers: API_VERSION_HEADER,
        body: { force: true },
      });
    },
  };
};

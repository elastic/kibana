/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs/promises';

import JSON5 from 'json5';
import { REPO_ROOT } from '@kbn/repo-info';

import * as Registry from '../services/epm/registry';
import { generatePackageInfoFromArchiveBuffer } from '../services/epm/archive';
import { PackageNotFoundError } from '../errors';

import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from '../services';

import { useDockerRegistry } from './helpers';

const EPR_URL = 'https://epr.elastic.co';

describe('validate bundled packages', () => {
  const registryUrl = useDockerRegistry();
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;

  beforeEach(() => {
    mockContract = createAppContextStartContractMock({
      registryUrl,
      // Required so getBundledPackages() does not throw; registry is used when path is missing
      developer: { bundledPackageLocation: '/tmp/fleet_bundled_packages' },
    });
    appContextService.start(mockContract);
  });

  async function getBundledPackageEntries() {
    const configFilePath = path.resolve(REPO_ROOT, 'fleet_packages.json');
    const configFile = await fs.readFile(configFilePath, 'utf8');
    const bundledPackages = JSON5.parse(configFile);

    return bundledPackages as Array<{ name: string; version: string }>;
  }

  async function fetchPackageFromRegistry(name: string, version: string) {
    const registryPackage = await Registry.getPackage(name, version);
    const packageArchive = await Registry.fetchArchiveBuffer({
      pkgName: name,
      pkgVersion: version,
      shouldVerify: false,
    });
    return { registryPackage, packageArchive };
  }

  async function setupPackageObjects() {
    // APM is a special case package in that it's "bundled release" is not available
    // on the v2 registry image, because v2 currently only contains production packages.
    // We bundle APM from snapshot, but that bundled version isn't available in the docker
    // image that's running EPR during FTR runs, so to avoid nasty test failures we don't
    // verify APM here.
    const EXCLUDED_PACKAGES = ['apm'];

    const bundledPackages = await getBundledPackageEntries();
    const packageObjects = [];

    for (const bundledPackage of bundledPackages.filter(
      (pkg) => !EXCLUDED_PACKAGES.includes(pkg.name)
    )) {
      try {
        packageObjects.push(
          await fetchPackageFromRegistry(bundledPackage.name, bundledPackage.version)
        );
      } catch (err) {
        if (!(err instanceof PackageNotFoundError)) throw err;

        // Package not in the Docker registry — fall back to epr.elastic.co in case the docker image is outdated (depends on https://buildkite.com/elastic/kibana-package-registry-verify-and-promote)
        appContextService.start(createAppContextStartContractMock({ registryUrl: EPR_URL }));
        try {
          packageObjects.push(
            await fetchPackageFromRegistry(bundledPackage.name, bundledPackage.version)
          );
        } finally {
          // Restore Docker registry URL for subsequent packages
          appContextService.start(mockContract);
        }
      }
    }

    return packageObjects;
  }

  it('generates matching package info objects for uploaded and registry packages', async () => {
    const packageObjects = await setupPackageObjects();

    for (const packageObject of packageObjects) {
      const { registryPackage, packageArchive } = packageObject;

      const archivePackageInfo = await generatePackageInfoFromArchiveBuffer(
        packageArchive.archiveBuffer,
        'application/zip'
      );

      expect(archivePackageInfo.packageInfo.data_streams).toEqual(
        registryPackage.packageInfo.data_streams
      );
    }
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { Installation } from '../../../../common';

import { reinstallPackageForInstallation } from './reinstall';
import { installPackage } from './install';
import { getBundledPackageForInstallation } from './bundled_packages';

jest.mock('./install');
jest.mock('./bundled_packages');

const mockedInstallPackage = jest.mocked(installPackage);
const mockedGetBundledPackageForInstallation = jest.mocked(getBundledPackageForInstallation);

describe('reinstallPackageForInstallation', () => {
  beforeEach(() => {
    mockedInstallPackage.mockReset();
    mockedGetBundledPackageForInstallation.mockImplementation(async ({ name }) => {
      if (name === 'test_bundled') {
        return {} as any;
      }
    });
  });
  it('should throw an error for uploaded package', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createInternalClient();
    await expect(
      reinstallPackageForInstallation({
        soClient,
        esClient,
        installation: {
          install_source: 'upload',
        } as Installation,
      })
    ).rejects.toThrow(/Cannot reinstall an uploaded package/);
  });

  it('should install registry package', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createInternalClient();
    await expect(
      reinstallPackageForInstallation({
        soClient,
        esClient,
        installation: {
          install_source: 'registry',
          name: 'test',
          version: '1.0.0',
        } as Installation,
      })
    );

    expect(mockedInstallPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        installSource: 'registry',
        pkgkey: 'test-1.0.0',
        force: true,
      })
    );
  });

  it('should install bundled package', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createInternalClient();
    await expect(
      reinstallPackageForInstallation({
        soClient,
        esClient,
        installation: {
          install_source: 'bundled',
          name: 'test_bundled',
          version: '1.0.0',
        } as Installation,
      })
    );

    expect(mockedInstallPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        installSource: 'registry',
        pkgkey: 'test_bundled-1.0.0',
        force: true,
      })
    );
  });

  // Pre 8.12.0 bundled package install where saved with install_source_upload
  it('should install bundled package saved with install_source:upload ', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createInternalClient();
    await expect(
      reinstallPackageForInstallation({
        soClient,
        esClient,
        installation: {
          install_source: 'upload',
          name: 'test_bundled',
          version: '1.0.0',
        } as Installation,
      })
    );

    expect(mockedInstallPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        installSource: 'registry',
        pkgkey: 'test_bundled-1.0.0',
        force: true,
      })
    );
  });
});

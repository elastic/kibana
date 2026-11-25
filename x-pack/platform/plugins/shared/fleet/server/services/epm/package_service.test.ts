/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../security', () => {
  return {
    ...jest.requireActual('../security'),
    getAuthzFromRequest: jest.fn(),
  };
});

import type { MockedLogger } from '@kbn/logging-mocks';

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { FleetUnauthorizedError } from '../../errors';
import type { InstallablePackage } from '../../types';

import { getAuthzFromRequest } from '../security';

import type { PackageClient, PackageService } from './package_service';
import { PackageServiceImpl } from './package_service';
import * as epmPackagesGet from './packages/get';
import * as epmPackagesInstall from './packages/install';
import * as epmRegistry from './registry';
import * as epmTransformsInstall from './elasticsearch/transform/install';
import * as epmArchiveParse from './archive/parse';
import * as epmBundledPackages from './packages/bundled_packages';
import * as epmArchiveIterator from './archive/archive_iterator';
import { getEsPackage } from './archive/storage';

jest.mock('./archive/storage');

const mockGetAuthzFromRequest = getAuthzFromRequest as jest.Mock;
const testKeys = [
  'getInstallation',
  'ensureInstalledPackage',
  'fetchFindLatestPackage',
  'getLatestPackageInfo',
  'getPackage',
  'getPackageFieldsMetadata',
  'reinstallEsAssets',
  'readBundledPackage',
];

function getTest(
  mocks: {
    packageClient: PackageClient;
    esClient?: ElasticsearchClient;
    soClient?: SavedObjectsClientContract;
    logger?: MockedLogger;
  },
  testKey: string
) {
  let test: {
    method: Function;
    args: any[];
    spy: jest.SpyInstance;
    spyArgs: any[];
    spyResponse: any;
    expectedReturnValue: any;
  };

  switch (testKey) {
    case testKeys[0]:
      test = {
        method: mocks.packageClient.getInstallation.bind(mocks.packageClient),
        args: ['package name'],
        spy: jest.spyOn(epmPackagesGet, 'getInstallation'),
        spyArgs: [
          {
            pkgName: 'package name',
            savedObjectsClient: mocks.soClient,
          },
        ],
        spyResponse: { name: 'getInstallation test' },
        expectedReturnValue: { name: 'getInstallation test' },
      };
      break;
    case testKeys[1]:
      test = {
        method: mocks.packageClient.ensureInstalledPackage.bind(mocks.packageClient),
        args: [{ pkgName: 'package name', pkgVersion: '8.0.0', spaceId: 'spaceId' }],
        spy: jest.spyOn(epmPackagesInstall, 'ensureInstalledPackage'),
        spyArgs: [
          {
            pkgName: 'package name',
            pkgVersion: '8.0.0',
            spaceId: 'spaceId',
            esClient: mocks.esClient,
            savedObjectsClient: mocks.soClient,
          },
        ],
        spyResponse: { name: 'ensureInstalledPackage test' },
        expectedReturnValue: { name: 'ensureInstalledPackage test' },
      };
      break;
    case testKeys[2]:
      test = {
        method: mocks.packageClient.fetchFindLatestPackage.bind(mocks.packageClient),
        args: ['package name'],
        spy: jest.spyOn(epmRegistry, 'fetchFindLatestPackageOrThrow'),
        spyArgs: ['package name', undefined],
        spyResponse: { name: 'fetchFindLatestPackage test' },
        expectedReturnValue: { name: 'fetchFindLatestPackage test' },
      };
      break;
    case testKeys[3]:
      test = {
        method: mocks.packageClient.getLatestPackageInfo.bind(mocks.packageClient),
        args: ['package name'],
        spy: jest.spyOn(epmPackagesGet, 'getPackageInfo'),
        spyArgs: [
          {
            pkgName: 'package name',
            pkgVersion: '',
            savedObjectsClient: mocks.soClient,
            prerelease: undefined,
          },
        ],
        spyResponse: { name: 'getLatestPackageInfo test' },
        expectedReturnValue: { name: 'getLatestPackageInfo test' },
      };
      break;
    case testKeys[4]:
      test = {
        method: mocks.packageClient.getPackage.bind(mocks.packageClient),
        args: ['package name', '8.0.0'],
        spy: jest.spyOn(epmPackagesGet, 'getPackageFromSource'),
        spyArgs: [
          {
            pkgName: 'package name',
            pkgVersion: '8.0.0',
            savedObjectsClient: mocks.soClient,
          },
        ],
        spyResponse: {
          packageInfo: { name: 'getPackage test' },
          paths: ['/some/test/path'],
        },
        expectedReturnValue: {
          packageInfo: { name: 'getPackage test' },
          paths: ['/some/test/path'],
        },
      };
      break;
    case testKeys[5]:
      test = {
        method: mocks.packageClient.getPackageFieldsMetadata.bind(mocks.packageClient),
        args: [{ packageName: 'package_name', datasetName: 'dataset_name' }],
        spy: jest.spyOn(epmRegistry, 'getPackageFieldsMetadata'),
        spyArgs: [{ packageName: 'package_name', datasetName: 'dataset_name' }, undefined],
        spyResponse: {
          dataset_name: { field_1: { flat_name: 'field_1', type: 'keyword' } },
        },
        expectedReturnValue: {
          dataset_name: { field_1: { flat_name: 'field_1', type: 'keyword' } },
        },
      };
      break;
    case testKeys[6]:
      const pkg: InstallablePackage = {
        format_version: '1.0.0',
        name: 'package name',
        title: 'package title',
        description: 'package description',
        version: '8.0.0',
        release: 'ga',
        owner: { github: 'elastic' },
      };
      const paths = ['some/test/transform/path'];

      test = {
        method: mocks.packageClient.reinstallEsAssets.bind(mocks.packageClient),
        args: [pkg, paths],
        spy: jest.spyOn(epmTransformsInstall, 'installTransforms'),
        spyArgs: [
          {
            packageInstallContext: expect.objectContaining({
              paths,
            }),
            esClient: mocks.esClient,
            savedObjectsClient: mocks.soClient,
            logger: mocks.logger,
            // package reinstall means we need to force transforms to reinstall
            force: true,
            // Undefined es references
            esReferences: undefined,
            // Undefined request
            request: undefined,
          },
        ],
        spyResponse: {
          installedTransforms: [
            {
              name: 'package name',
            },
          ],
        },
        expectedReturnValue: [
          {
            name: 'package name',
          },
        ],
      };
      break;
    case testKeys[7]:
      const bundledPackage = {
        name: 'package name',
        version: '8.0.0',
        getBuffer: () => Buffer.from([]),
      };
      test = {
        method: mocks.packageClient.readBundledPackage.bind(mocks.packageClient),
        args: [bundledPackage],
        spy: jest.spyOn(epmArchiveParse, 'generatePackageInfoFromArchiveBuffer'),
        spyArgs: [bundledPackage.getBuffer(), 'application/zip'],
        spyResponse: {
          packageInfo: { name: 'readBundledPackage test' },
          paths: ['/some/test/path'],
        },
        expectedReturnValue: {
          packageInfo: { name: 'readBundledPackage test' },
          paths: ['/some/test/path'],
        },
      };
      break;
    default:
      throw new Error('invalid test key');
  }

  return test;
}

describe('PackageService', () => {
  let mockPackageService: PackageService;
  let mockEsClient: ElasticsearchClient;
  let mockSoClient: SavedObjectsClientContract;
  let mockLogger: MockedLogger;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
    mockSoClient = savedObjectsClientMock.create();
    mockLogger = loggingSystemMock.createLogger();
    mockPackageService = new PackageServiceImpl(mockEsClient, mockSoClient, mockLogger);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('asScoped', () => {
    describe.each(testKeys)('without required privileges', (testKey: string) => {
      const unauthError = new FleetUnauthorizedError(
        `User does not have adequate permissions to access Fleet packages.`
      );
      beforeEach(() => {
        mockGetAuthzFromRequest.mockResolvedValueOnce({
          integrations: {
            installPackages: false,
            readPackageInfo: false,
          },
        });
      });

      it(`rejects on ${testKey}`, async () => {
        const { method, args } = getTest(
          { packageClient: mockPackageService.asScoped(httpServerMock.createKibanaRequest()) },
          testKey
        );
        await expect(method(...args)).rejects.toThrow(unauthError);
      });
    });

    describe.each(testKeys)('with required privileges', (testKey: string) => {
      beforeEach(() => {
        mockGetAuthzFromRequest.mockResolvedValueOnce({
          integrations: {
            installPackages: true,
            readPackageInfo: true,
          },
        });
      });
      it(`calls ${testKey} and returns results`, async () => {
        const mockClients = {
          packageClient: mockPackageService.asInternalUser,
          esClient: mockEsClient,
          soClient: mockSoClient,
          logger: mockLogger,
        };
        const { method, args, spy, spyArgs, spyResponse, expectedReturnValue } = getTest(
          mockClients,
          testKey
        );
        spy.mockResolvedValue(spyResponse);
        if (testKey === 'reinstallEsAssets') {
          jest
            .mocked(epmPackagesGet.getInstallation)
            .mockResolvedValue({ name: 'package name' } as any);
          jest.mocked(getEsPackage).mockResolvedValue({ name: 'package name' } as any);
        }
        await expect(method(...args)).resolves.toEqual(expectedReturnValue);
        expect(spy).toHaveBeenCalledWith(...spyArgs);
      });
    });
  });

  describe.each(testKeys)('asInternalUser', (testKey: string) => {
    it(`calls ${testKey} and returns results`, async () => {
      const mockClients = {
        packageClient: mockPackageService.asInternalUser,
        esClient: mockEsClient,
        soClient: mockSoClient,
        logger: mockLogger,
      };
      const { method, args, spy, spyArgs, spyResponse, expectedReturnValue } = getTest(
        mockClients,
        testKey
      );
      spy.mockResolvedValue(spyResponse);
      if (testKey === 'reinstallEsAssets') {
        jest
          .mocked(epmPackagesGet.getInstallation)
          .mockResolvedValue({ name: 'package name' } as any);
        jest.mocked(getEsPackage).mockResolvedValue({ name: 'package name' } as any);
      }
      if (testKey === 'getPackage') {
        jest.mocked(epmPackagesGet.getInstallation).mockResolvedValue(undefined);
      }

      await expect(method(...args)).resolves.toEqual(expectedReturnValue);
      expect(spy).toHaveBeenCalledWith(...spyArgs);
    });
  });

  describe('getPackage - bundled package fallback', () => {
    const pkgName = 'apm';
    const pkgVersion = '9.3.1';
    const packageInfo = { name: pkgName, version: pkgVersion };
    const paths = ['/some/bundled/path'];

    it('calls getPackageFromSource without installedPkg', async () => {
      jest
        .spyOn(epmPackagesGet, 'getPackageFromSource')
        .mockResolvedValue({ packageInfo: packageInfo as any, paths });

      const result = await mockPackageService.asInternalUser.getPackage(pkgName, pkgVersion);

      expect(result).toEqual({ packageInfo, paths });
      expect(epmPackagesGet.getPackageFromSource).toHaveBeenCalledWith({
        pkgName,
        pkgVersion,
        savedObjectsClient: mockSoClient,
      });
    });

    it('propagates PackageNotFoundError when package cannot be found anywhere', async () => {
      const { PackageNotFoundError } = jest.requireActual('../../errors');
      jest
        .spyOn(epmPackagesGet, 'getPackageFromSource')
        .mockRejectedValue(
          new PackageNotFoundError(`Package info for ${pkgName}-${pkgVersion} does not exist`)
        );

      await expect(
        mockPackageService.asInternalUser.getPackage(pkgName, pkgVersion)
      ).rejects.toThrow(`Package info for ${pkgName}-${pkgVersion} does not exist`);
    });
  });

  describe('reinstallEsAssets - transform install source', () => {
    const packageInfo: InstallablePackage = {
      format_version: '1.0.0',
      name: 'my_package',
      title: 'My Package',
      description: 'description',
      version: '1.0.0',
      release: 'ga',
      owner: { github: 'elastic' },
    };
    const paths = ['my_package-1.0.0/elasticsearch/transform/probe/transform.yml'];

    const mockInstallation = (installSource: string) => {
      jest
        .mocked(epmPackagesGet.getInstallation)
        .mockResolvedValue({ name: packageInfo.name, install_source: installSource } as any);
      jest.mocked(getEsPackage).mockResolvedValue({ assetsMap: new Map() } as any);
      jest
        .spyOn(epmBundledPackages, 'getBundledPackageForInstallation')
        .mockResolvedValue(undefined);
    };

    // A reinstall replays the archive stored at install time, so the source recorded on the
    // installation — not the reinstall call site — decides whether transforms may run as
    // kibana_system.
    it.each(['registry', 'upload'])(
      'forwards install_source %p from the installation',
      async (installSource) => {
        mockInstallation(installSource);
        const spy = jest
          .spyOn(epmTransformsInstall, 'installTransforms')
          .mockResolvedValue({ installedTransforms: [] } as any);

        await mockPackageService.asInternalUser.reinstallEsAssets(packageInfo, paths);

        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ installSource }));
      }
    );

    // The documented new failure mode: an uploaded package reinstalled without a user request
    // has no credentials to grant a secondary authorization API key from, so installTransforms
    // refuses rather than falling back to kibana_system.
    it('surfaces the unauthorized error when an uploaded package is reinstalled without a request', async () => {
      mockInstallation('upload');
      jest
        .spyOn(epmTransformsInstall, 'installTransforms')
        .mockRejectedValue(new FleetUnauthorizedError('no secondary authorization'));

      await expect(
        mockPackageService.asInternalUser.reinstallEsAssets(packageInfo, paths)
      ).rejects.toThrow(FleetUnauthorizedError);
    });

    describe('upload installation of a bundled package', () => {
      const bundledBuffer = Buffer.from('bundled-zip');

      it('reinstalls from the bundled archive as bundled when a matching bundled package exists', async () => {
        mockInstallation('upload');
        const bundledIterator = { name: 'bundled-iterator' } as any;
        jest.spyOn(epmBundledPackages, 'getBundledPackageForInstallation').mockResolvedValue({
          name: packageInfo.name,
          version: packageInfo.version,
          getBuffer: async () => bundledBuffer,
        });
        const iteratorSpy = jest
          .spyOn(epmArchiveIterator, 'createArchiveIterator')
          .mockReturnValue(bundledIterator);
        const spy = jest
          .spyOn(epmTransformsInstall, 'installTransforms')
          .mockResolvedValue({ installedTransforms: [] } as any);

        await mockPackageService.asInternalUser.reinstallEsAssets(packageInfo, paths);

        expect(iteratorSpy).toHaveBeenCalledWith(bundledBuffer, 'application/zip');
        expect(getEsPackage).not.toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({
            installSource: 'bundled',
            packageInstallContext: expect.objectContaining({ archiveIterator: bundledIterator }),
          })
        );
      });

      it('keeps the upload source and stored archive when no matching bundled package exists', async () => {
        mockInstallation('upload');
        jest
          .spyOn(epmBundledPackages, 'getBundledPackageForInstallation')
          .mockResolvedValue(undefined);
        const spy = jest
          .spyOn(epmTransformsInstall, 'installTransforms')
          .mockResolvedValue({ installedTransforms: [] } as any);

        await mockPackageService.asInternalUser.reinstallEsAssets(packageInfo, paths);

        expect(getEsPackage).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({ installSource: 'upload' }));
      });
    });

    it('passes no request when not scoped to one', async () => {
      mockInstallation('upload');
      const spy = jest
        .spyOn(epmTransformsInstall, 'installTransforms')
        .mockResolvedValue({ installedTransforms: [] } as any);

      await mockPackageService.asInternalUser.reinstallEsAssets(packageInfo, paths);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ request: undefined }));
    });
  });
});

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
        spy: jest.spyOn(epmRegistry, 'getPackage'),
        spyArgs: ['package name', '8.0.0', undefined],
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
            // Undefined secondary authorization
            authorizationHeader: undefined,
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
        await expect(method(...args)).rejects.toThrowError(unauthError);
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

      await expect(method(...args)).resolves.toEqual(expectedReturnValue);
      expect(spy).toHaveBeenCalledWith(...spyArgs);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';
import type { ElasticsearchClient, SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';

import type {
  ArchivePackage,
  InstallablePackage,
  Installation,
  RegistryPackage,
} from '../../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../common';

import { sendTelemetryEvents } from '../../upgrade_sender';
import { licenseService } from '../../license';
import { auditLoggingService } from '../../audit_logging';
import { appContextService } from '../../app_context';
import {
  ConcurrentInstallOperationError,
  FleetError,
  PackageInvalidArchiveError,
  PackageNotFoundError,
} from '../../../errors';
import { isAgentlessEnabled, isOnlyAgentlessIntegration } from '../../utils/agentless';

import * as Registry from '../registry';
import { dataStreamService } from '../../data_streams';
import {
  generatePackageInfoFromArchiveBuffer,
  setPackageInfo,
  deleteVerificationResult,
} from '../archive';

import {
  createInstallation,
  handleInstallPackageFailure,
  installAssetsForInputPackagePolicy,
  installPackage,
  isPackageVersionOrLaterInstalled,
} from './install';
import * as installStateMachine from './install_state_machine/_state_machine_package_install';
import { getBundledPackageByName, getBundledPackageByPkgKey } from './bundled_packages';

import {
  getInstalledPackageWithAssets,
  getInstallationObject,
  getPackageSavedObjects,
} from './get';
import { optimisticallyAddEsAssetReferences } from './es_assets_reference';

jest.mock('../../data_streams');
jest.mock('./get');
jest.mock('./install_index_template_pipeline');
jest.mock('./es_assets_reference');
jest.mock('../../app_context', () => {
  const logger = { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() };
  const mockedSavedObjectTagging = {
    createInternalAssignmentService: jest.fn(),
    createTagClient: jest.fn(),
  };

  return {
    appContextService: {
      getLogger: jest.fn(() => {
        return logger;
      }),
      getTelemetryEventsSender: jest.fn(),
      getSavedObjects: jest.fn(() => ({
        createImporter: jest.fn(),
      })),
      getConfig: jest.fn(() => ({})),
      getSavedObjectsTagging: jest.fn(() => mockedSavedObjectTagging),
      getInternalUserSOClientForSpaceId: jest.fn(),
      getExperimentalFeatures: jest.fn(),
      getKibanaVersion: jest.fn(() => '1.0.0'),
    },
  };
});

jest.mock('.');
jest.mock('../registry', () => {
  return {
    ...jest.requireActual('../registry'),
    fetchFindLatestPackageOrThrow: jest.fn(),
    getPackage: jest.fn(),
  };
});
jest.mock('../../upgrade_sender');
jest.mock('../../license');
jest.mock('../../upgrade_sender');
jest.mock('./cleanup');
jest.mock('./bundled_packages');
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  getLastUploadInstallCache: jest.fn(),
  setLastUploadInstallCache: jest.fn(),
}));
jest.mock('./install_state_machine/_state_machine_package_install', () => {
  return {
    _stateMachineInstallPackage: jest.fn(() => Promise.resolve()),
  };
});
jest.mock('../kibana/index_pattern/install', () => {
  return {
    installIndexPatterns: jest.fn(() => Promise.resolve()),
  };
});
jest.mock('../archive', () => {
  return {
    generatePackageInfoFromArchiveBuffer: jest.fn(() =>
      Promise.resolve({ packageInfo: { name: 'apache', version: '1.3.0' } })
    ),
    unpackBufferToAssetsMap: jest.fn(() =>
      Promise.resolve({
        assetsMap: new Map(),
        paths: [],
      })
    ),
    setPackageInfo: jest.fn(),
    deleteVerificationResult: jest.fn(),
  };
});
jest.mock('../../audit_logging');

jest.mock('../../utils/agentless', () => {
  return {
    isAgentlessEnabled: jest.fn(),
    isOnlyAgentlessIntegration: jest.fn(),
  };
});

const mockGetBundledPackageByPkgKey = jest.mocked(getBundledPackageByPkgKey);
const mockedAuditLoggingService = jest.mocked(auditLoggingService);

const emptyPackageSavedObjects: SavedObjectsFindResponse<Installation> = {
  page: 1,
  per_page: 20,
  total: 0,
  saved_objects: [],
};

function archivePackageFixture(
  overrides: Pick<ArchivePackage, 'name' | 'version'> &
    Partial<Pick<ArchivePackage, 'data_streams'>>
): ArchivePackage {
  return {
    format_version: '3.0.0',
    title: overrides.name,
    description: 'test',
    owner: { github: 'elastic' },
    ...overrides,
  };
}

function parsedArchiveFixture(
  overrides: Pick<ArchivePackage, 'name' | 'version'> &
    Partial<Pick<ArchivePackage, 'data_streams'>>
): {
  paths: string[];
  packageInfo: ArchivePackage;
} {
  return {
    paths: [],
    packageInfo: archivePackageFixture(overrides),
  };
}

function registryPackageFixture(
  overrides: Pick<RegistryPackage, 'name' | 'version'>
): RegistryPackage {
  return {
    name: overrides.name,
    version: overrides.version,
    format_version: '3.0.0',
    title: overrides.name,
    description: 'test',
    owner: { github: 'elastic' },
    download: `/epr/${overrides.name}/${overrides.name}-${overrides.version}.zip`,
    path: `/package/${overrides.name}/${overrides.version}`,
  };
}

function uploadedInstallationSO(version: string): SavedObject<Installation> {
  return {
    id: 'apache',
    type: PACKAGES_SAVED_OBJECT_TYPE,
    references: [],
    attributes: {
      name: 'apache',
      version,
      install_status: 'installed',
      install_version: version,
      install_started_at: '2020-01-01T00:00:00.000Z',
      install_source: 'upload',
      installed_kibana: [],
      installed_es: [],
      es_index_patterns: {},
      verification_status: 'unknown',
    },
  };
}

describe('createInstallation', () => {
  const soClient = savedObjectsClientMock.create();

  const packageInfo: InstallablePackage = {
    name: 'test-package',
    version: '1.0.0',
    format_version: '1.0.0',
    title: 'Test Package',
    description: 'A package for testing',
    owner: {
      github: 'elastic',
    },
  };

  describe('installSource: registry', () => {
    it('should call audit logger', async () => {
      await createInstallation({
        savedObjectsClient: soClient,
        packageInfo,
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'create',
        id: 'test-package',
        savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
      });
    });
  });

  describe('installSource: upload', () => {
    it('should call audit logger', async () => {
      await createInstallation({
        savedObjectsClient: soClient,
        packageInfo,
        installSource: 'upload',
        spaceId: DEFAULT_SPACE_ID,
      });

      expect(mockedAuditLoggingService.writeCustomSoAuditLog).toHaveBeenCalledWith({
        action: 'create',
        id: 'test-package',
        savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
      });
    });
  });
});

describe('install', () => {
  beforeEach(() => {
    jest
      .mocked(Registry.fetchFindLatestPackageOrThrow)
      .mockImplementation(() => Promise.resolve({ version: '1.3.0' } as any));
    jest.mocked(Registry.getPackage).mockImplementation(() =>
      Promise.resolve({
        packageInfo: { license: 'basic', conditions: { elastic: { subscription: 'basic' } } },
        paths: [],
      } as any)
    );

    mockGetBundledPackageByPkgKey.mockReset();
    (installStateMachine._stateMachineInstallPackage as jest.Mock).mockClear();
    jest.mocked(appContextService.getInternalUserSOClientForSpaceId).mockReset();
  });

  describe('registry', () => {
    beforeEach(() => {
      mockGetBundledPackageByPkgKey.mockResolvedValue(undefined);
    });

    it('should send telemetry on install failure, out of date', async () => {
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.1.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        errorMessage: 'apache-1.1.0 is out-of-date and cannot be installed or updated',
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.1.0',
        packageName: 'apache',
        status: 'failure',
      });
    });

    it('should send telemetry on install failure, license error', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(false);
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.3.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        errorMessage: 'Installation requires basic license',
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'failure',
      });
    });

    it('should send telemetry on install success', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.3.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'success',
      });
    });

    it('should send telemetry on update success', async () => {
      jest
        .mocked(getInstallationObject)
        .mockResolvedValueOnce({ attributes: { version: '1.2.0', installed_kibana: [] } } as any);

      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.3.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: '1.2.0',
        dryRun: false,
        eventType: 'package-install',
        installType: 'update',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'success',
      });
    });

    it('should send telemetry on install failure, async error', async () => {
      jest
        .mocked(installStateMachine._stateMachineInstallPackage)
        .mockRejectedValue(new Error('error'));
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);

      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.3.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        errorMessage: 'error',
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'failure',
      });
    });

    it('should install from bundled package if one exists', async () => {
      (installStateMachine._stateMachineInstallPackage as jest.Mock).mockResolvedValue({});
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      mockGetBundledPackageByPkgKey.mockResolvedValue({
        name: 'test_package',
        version: '1.0.0',
        getBuffer: async () => Buffer.from('test_package'),
      });

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'test_package-1.0.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.error).toBeUndefined();

      expect(installStateMachine._stateMachineInstallPackage).toHaveBeenCalledWith(
        expect.objectContaining({ installSource: 'bundled' })
      );
    });

    it('skips upload validation for bundled installs', async () => {
      (installStateMachine._stateMachineInstallPackage as jest.Mock).mockResolvedValue({});
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      jest
        .mocked(generatePackageInfoFromArchiveBuffer)
        .mockResolvedValueOnce(parsedArchiveFixture({ name: 'bad.name', version: '1.0.0' }));
      mockGetBundledPackageByPkgKey.mockResolvedValue({
        name: 'test_package',
        version: '1.0.0',
        getBuffer: async () => Buffer.from('test_package'),
      });

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'test_package-1.0.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.error).toBeUndefined();
      expect(installStateMachine._stateMachineInstallPackage).toHaveBeenCalledWith(
        expect.objectContaining({ installSource: 'bundled' })
      );
    });

    it('should fetch latest version if version not provided', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'test_package',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.status).toEqual('installed');

      expect(sendTelemetryEvents).toHaveBeenCalledWith(
        expect.anything(),
        undefined,
        expect.objectContaining({
          newVersion: '1.3.0',
        })
      );
    });

    it('should do nothing if same version is installed', async () => {
      jest.mocked(getInstallationObject).mockResolvedValueOnce({
        attributes: {
          version: '1.2.0',
          install_status: 'installed',
          installed_es: [],
          installed_kibana: [],
        },
      } as any);
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'apache-1.2.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.status).toEqual('already_installed');
    });

    describe('agentless', () => {
      beforeEach(() => {
        jest.mocked(appContextService.getConfig).mockClear();
        jest.spyOn(licenseService, 'hasAtLeast').mockClear();
        jest.mocked(isAgentlessEnabled).mockClear();
        jest.mocked(isOnlyAgentlessIntegration).mockClear();
      });

      it('should not allow to install agentless only integration if agentless is not enabled', async () => {
        jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
        jest.mocked(isAgentlessEnabled).mockReturnValueOnce(false);
        jest.mocked(isOnlyAgentlessIntegration).mockReturnValueOnce(true);

        const response = await installPackage({
          spaceId: DEFAULT_SPACE_ID,
          installSource: 'registry',
          pkgkey: 'test_package',
          savedObjectsClient: savedObjectsClientMock.create(),
          esClient: {} as ElasticsearchClient,
        });
        expect(response.error).toBeDefined();
        expect(response.error!.message).toEqual(
          'test_package contains agentless policy templates, agentless is not available on this deployment'
        );
      });

      it('should allow to install agentless only integration if agentless is not enabled but using force flag', async () => {
        jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
        jest.mocked(isAgentlessEnabled).mockReturnValueOnce(false);
        jest.mocked(isOnlyAgentlessIntegration).mockReturnValueOnce(true);

        const response = await installPackage({
          spaceId: DEFAULT_SPACE_ID,
          installSource: 'registry',
          pkgkey: 'test_package',
          savedObjectsClient: savedObjectsClientMock.create(),
          esClient: {} as ElasticsearchClient,
          force: true,
        });
        expect(response.error).toBeUndefined();
      });

      it('should allow to install agentless only integration if agentless is enabled', async () => {
        jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
        jest.mocked(isAgentlessEnabled).mockReturnValueOnce(true);
        jest.mocked(isOnlyAgentlessIntegration).mockReturnValueOnce(true);

        const response = await installPackage({
          spaceId: DEFAULT_SPACE_ID,
          installSource: 'registry',
          pkgkey: 'test_package',
          savedObjectsClient: savedObjectsClientMock.create(),
          esClient: {} as ElasticsearchClient,
        });
        expect(response.error).toBeUndefined();
      });
    });

    it('should allow to install fleet_server if internal.fleetServerStandalone is configured', async () => {
      jest.mocked(appContextService.getConfig).mockReturnValueOnce({
        internal: {
          fleetServerStandalone: true,
        },
      } as any);
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValueOnce(true);
      jest.mocked(isOnlyAgentlessIntegration).mockReturnValueOnce(false);

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'fleet_server-2.0.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.status).toEqual('installed');
    });

    it('should use streaming installation for the detection rules package', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'security_detection_engine',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.error).toBeUndefined();

      expect(installStateMachine._stateMachineInstallPackage).toHaveBeenCalledWith(
        expect.objectContaining({ useStreaming: true })
      );
    });
  });

  describe('upload', () => {
    beforeEach(() => {
      jest
        .mocked(Registry.fetchFindLatestPackageOrThrow)
        .mockRejectedValue(new PackageNotFoundError('not found'));
      jest.mocked(getPackageSavedObjects).mockResolvedValue(emptyPackageSavedObjects);
      jest.mocked(getBundledPackageByName).mockResolvedValue(undefined);
      jest.mocked(setPackageInfo).mockClear();
      jest.mocked(deleteVerificationResult).mockClear();
    });

    it('validates real uploads and skips the install when validation fails', async () => {
      jest
        .mocked(generatePackageInfoFromArchiveBuffer)
        .mockResolvedValueOnce(parsedArchiveFixture({ name: 'bad.name', version: '1.0.0' }));

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.error).toBeInstanceOf(PackageInvalidArchiveError);
      expect(response.error).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('Uploaded package name "bad.name" is invalid'),
        })
      );
      expect(installStateMachine._stateMachineInstallPackage).not.toHaveBeenCalled();
      expect(setPackageInfo).not.toHaveBeenCalled();
      expect(deleteVerificationResult).not.toHaveBeenCalled();
    });

    it('rejects an upload that claims an existing generic-logs data stream', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          {
            name: 'logs-payroll.records-default',
            timestamp_field: { name: '@timestamp' },
            indices: [
              {
                index_name: '.ds-logs-payroll.records-default-000001',
                index_uuid: 'uuid',
              },
            ],
            generation: 1,
            hidden: false,
            next_generation_managed_by: 'Index Lifecycle Management',
            prefer_ilm: true,
            rollover_on_write: false,
            settings: {},
            status: 'GREEN',
            template: 'logs',
          },
        ],
      });
      jest.mocked(generatePackageInfoFromArchiveBuffer).mockResolvedValueOnce(
        parsedArchiveFixture({
          name: 'evilclaim',
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'payroll.records',
              type: 'logs',
              title: 'Payroll records',
              release: 'ga',
              package: 'evilclaim',
              path: 'payroll.records',
            },
          ],
        })
      );

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient,
      });

      expect(response.error).toBeInstanceOf(PackageInvalidArchiveError);
      expect(response.error).toEqual(
        expect.objectContaining({
          message: expect.stringContaining('logs-payroll.records-default'),
        })
      );
      expect(installStateMachine._stateMachineInstallPackage).not.toHaveBeenCalled();
      expect(setPackageInfo).not.toHaveBeenCalled();
      expect(deleteVerificationResult).not.toHaveBeenCalled();
    });

    it('rejects a first upload when a matching live stream already uses the same package name', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient();
      esClient.indices.getDataStream.mockResolvedValue({
        data_streams: [
          {
            name: 'logs-payroll.records-default',
            timestamp_field: { name: '@timestamp' },
            indices: [
              {
                index_name: '.ds-logs-payroll.records-default-000001',
                index_uuid: 'uuid',
              },
            ],
            generation: 1,
            hidden: false,
            next_generation_managed_by: 'Index Lifecycle Management',
            prefer_ilm: true,
            rollover_on_write: false,
            settings: {},
            status: 'GREEN',
            template: 'logs-payroll.records',
            _meta: { managed_by: 'fleet', managed: true, package: { name: 'evilclaim' } },
          },
        ],
      });
      jest.mocked(generatePackageInfoFromArchiveBuffer).mockResolvedValueOnce(
        parsedArchiveFixture({
          name: 'evilclaim',
          version: '1.0.0',
          data_streams: [
            {
              dataset: 'payroll.records',
              type: 'logs',
              title: 'Payroll records',
              release: 'ga',
              package: 'evilclaim',
              path: 'payroll.records',
            },
          ],
        })
      );

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient,
      });

      expect(response.error).toBeInstanceOf(PackageInvalidArchiveError);
      expect(response.error).toEqual(
        expect.objectContaining({
          message: expect.stringMatching(/must be migrated or removed/),
        })
      );
      expect(installStateMachine._stateMachineInstallPackage).not.toHaveBeenCalled();
      expect(setPackageInfo).not.toHaveBeenCalled();
    });

    it('does not query the registry when re-uploading an existing upload package', async () => {
      jest.mocked(getInstallationObject).mockResolvedValueOnce(uploadedInstallationSO('1.2.0'));
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      jest
        .mocked(Registry.fetchFindLatestPackageOrThrow)
        .mockResolvedValue(registryPackageFixture({ name: 'apache', version: '1.3.0' }));

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.error).toBeUndefined();
      expect(Registry.fetchFindLatestPackageOrThrow).not.toHaveBeenCalledWith(
        'apache',
        expect.objectContaining({
          ignoreConstraints: true,
          prerelease: true,
          throwOnError: true,
        })
      );
    });

    it('rejects a registry package name when skipUploadPackageValidation is unset', async () => {
      jest
        .mocked(Registry.fetchFindLatestPackageOrThrow)
        .mockResolvedValue(registryPackageFixture({ name: 'apache', version: '1.3.0' }));

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.error).toBeInstanceOf(PackageInvalidArchiveError);
      expect(response.error).toEqual(
        expect.objectContaining({
          message: expect.stringContaining(
            'Cannot upload a package whose name already exists in the package registry'
          ),
        })
      );
      expect(installStateMachine._stateMachineInstallPackage).not.toHaveBeenCalled();
    });

    it('fails closed when the installation saved object lookup throws', async () => {
      jest.mocked(getInstallationObject).mockRejectedValueOnce(new Error('so unavailable'));

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(getInstallationObject).toHaveBeenCalledWith(
        expect.objectContaining({ failOnUnexpectedError: true })
      );
      expect(response.error).toEqual(
        expect.objectContaining({
          message: 'so unavailable',
        })
      );
      expect(installStateMachine._stateMachineInstallPackage).not.toHaveBeenCalled();
    });

    it('proceeds with a bundled install when the installation saved object lookup throws', async () => {
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      (installStateMachine._stateMachineInstallPackage as jest.Mock).mockResolvedValueOnce({});
      mockGetBundledPackageByPkgKey.mockResolvedValueOnce({
        name: 'test_package',
        version: '1.0.0',
        getBuffer: async () => Buffer.from('test_package'),
      });
      jest
        .mocked(getInstallationObject)
        .mockImplementationOnce(async ({ failOnUnexpectedError }) => {
          const error = new Error('so unavailable');
          if (failOnUnexpectedError) {
            throw error;
          }
          appContextService.getLogger().error(error);
          return undefined;
        });

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'registry',
        pkgkey: 'test_package-1.0.0',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(getInstallationObject).toHaveBeenCalledWith(
        expect.objectContaining({ failOnUnexpectedError: false })
      );
      expect(appContextService.getLogger().error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'so unavailable' })
      );
      expect(response.error).toBeUndefined();
      expect(installStateMachine._stateMachineInstallPackage).toHaveBeenCalled();
    });

    it('rejects a legacy bundled installation recorded as upload', async () => {
      jest.mocked(getInstallationObject).mockResolvedValueOnce(uploadedInstallationSO('1.2.0'));
      jest.mocked(getBundledPackageByName).mockResolvedValue({
        name: 'apache',
        version: '1.2.0',
        getBuffer: async () => Buffer.from(''),
      });

      const response = await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(response.error).toBeInstanceOf(PackageInvalidArchiveError);
      expect(response.error).toEqual(
        expect.objectContaining({
          message: expect.stringContaining(
            'Cannot upload a package that replaces the bundled-installed package'
          ),
        })
      );
      expect(installStateMachine._stateMachineInstallPackage).not.toHaveBeenCalled();
    });

    it('allows a first upload in air-gapped mode when the name has no bundled match', async () => {
      jest.mocked(appContextService.getConfig).mockReturnValue({ isAirGapped: true } as any);
      jest
        .mocked(generatePackageInfoFromArchiveBuffer)
        .mockResolvedValueOnce(parsedArchiveFixture({ name: 'custom_probe', version: '1.0.0' }));

      try {
        const response = await installPackage({
          spaceId: DEFAULT_SPACE_ID,
          installSource: 'upload',
          archiveBuffer: {} as Buffer,
          contentType: '',
          savedObjectsClient: savedObjectsClientMock.create(),
          esClient: {} as ElasticsearchClient,
        });

        // The registry is never contacted for installs in air-gapped mode, so pre-squatting
        // a registry name has nothing to intercept there; only local bundled names matter.
        expect(response.error).toBeUndefined();
        expect(Registry.fetchFindLatestPackageOrThrow).not.toHaveBeenCalledWith(
          'custom_probe',
          expect.objectContaining({
            ignoreConstraints: true,
            prerelease: true,
            throwOnError: true,
          })
        );
      } finally {
        jest.mocked(appContextService.getConfig).mockReturnValue({} as any);
      }
    });

    it('rejects a first upload in air-gapped mode when the name matches a bundled package', async () => {
      jest.mocked(appContextService.getConfig).mockReturnValue({ isAirGapped: true } as any);
      jest
        .mocked(generatePackageInfoFromArchiveBuffer)
        .mockResolvedValueOnce(parsedArchiveFixture({ name: 'apache', version: '1.0.0' }));
      jest.mocked(getBundledPackageByName).mockResolvedValue({
        name: 'apache',
        version: '1.2.0',
        getBuffer: async () => Buffer.from(''),
      });

      try {
        const response = await installPackage({
          spaceId: DEFAULT_SPACE_ID,
          installSource: 'upload',
          archiveBuffer: {} as Buffer,
          contentType: '',
          savedObjectsClient: savedObjectsClientMock.create(),
          esClient: {} as ElasticsearchClient,
        });

        expect(response.error).toBeInstanceOf(PackageInvalidArchiveError);
        expect(response.error).toEqual(
          expect.objectContaining({
            message: expect.stringContaining(
              'Cannot upload a package whose name already exists in the package registry'
            ),
          })
        );
        expect(installStateMachine._stateMachineInstallPackage).not.toHaveBeenCalled();
      } finally {
        jest.mocked(appContextService.getConfig).mockReturnValue({} as any);
      }
    });

    it('should send telemetry on update', async () => {
      jest.mocked(getInstallationObject).mockResolvedValueOnce(uploadedInstallationSO('1.2.0'));
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: '1.2.0',
        dryRun: false,
        eventType: 'package-install',
        installType: 'update',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'success',
      });
    });

    it('should send telemetry on install success', async () => {
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'success',
      });
    });

    it('should send telemetry on install failure, async error', async () => {
      jest
        .mocked(installStateMachine._stateMachineInstallPackage)
        .mockRejectedValue(new Error('error'));
      jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
      await installPackage({
        spaceId: DEFAULT_SPACE_ID,
        installSource: 'upload',
        archiveBuffer: {} as Buffer,
        contentType: '',
        savedObjectsClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
      });

      expect(sendTelemetryEvents).toHaveBeenCalledWith(expect.anything(), undefined, {
        currentVersion: 'not_installed',
        dryRun: false,
        errorMessage: 'error',
        eventType: 'package-install',
        installType: 'install',
        newVersion: '1.3.0',
        packageName: 'apache',
        status: 'failure',
      });
    });
  });
});

describe('installAssetsForInputPackagePolicy', () => {
  beforeEach(() => {
    jest.mocked(optimisticallyAddEsAssetReferences).mockReset();
  });
  it('should do nothing for non input package', async () => {
    const mockedLogger = jest.mocked(appContextService.getLogger());
    await installAssetsForInputPackagePolicy({
      pkgInfo: {
        type: 'integration',
      } as any,
      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {} as any,
    });
  });
  const TEST_PKG_INFO_INPUT = {
    type: 'input',
    name: 'test',
    version: '1.0.0',
    policy_templates: [
      {
        name: 'log',
        type: 'log',
      },
    ],
  };
  it('should throw for input package if package is not installed', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);
    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue(undefined);
    const mockedLogger = jest.mocked(appContextService.getLogger());

    await expect(() =>
      installAssetsForInputPackagePolicy({
        pkgInfo: TEST_PKG_INFO_INPUT as any,
        soClient: savedObjectsClientMock.create(),
        esClient: {} as ElasticsearchClient,
        force: false,
        logger: mockedLogger,
        packagePolicy: {
          inputs: [
            {
              type: 'log',
              streams: [{ data_stream: { type: 'log' }, vars: { dataset: 'test.tata' } }],
            },
          ],
        } as any,
      })
    ).rejects.toThrowError(PackageNotFoundError);
  });

  it('should install es index patterns for input package if package is installed', async () => {
    jest.mocked(dataStreamService).getMatchingDataStreams.mockResolvedValue([]);

    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      installation: {
        name: 'test',
        version: '1.0.0',
      },
      packageInfo: TEST_PKG_INFO_INPUT,
      assetsMap: new Map(),
      paths: [],
    } as any);
    const mockedLogger = jest.mocked(appContextService.getLogger());

    await installAssetsForInputPackagePolicy({
      pkgInfo: TEST_PKG_INFO_INPUT as any,

      soClient: savedObjectsClientMock.create(),
      esClient: {} as ElasticsearchClient,
      force: false,
      logger: mockedLogger,
      packagePolicy: {
        inputs: [
          {
            name: 'log',
            type: 'log',
            streams: [
              {
                data_stream: { type: 'log' },
                vars: { 'data_stream.dataset': { value: 'test.tata' } },
              },
            ],
          },
        ],
      } as any,
    });

    expect(jest.mocked(optimisticallyAddEsAssetReferences)).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      {
        'test.tata': 'log-test.tata-*',
      }
    );
  });
});

describe('handleInstallPackageFailure', () => {
  const mockedLogger = jest.mocked(appContextService.getLogger());
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    mockedLogger.error.mockClear();
    jest.mocked(installStateMachine._stateMachineInstallPackage).mockClear();
    jest.mocked(installStateMachine._stateMachineInstallPackage).mockClear();
    mockGetBundledPackageByPkgKey.mockReset();

    jest.mocked(installStateMachine._stateMachineInstallPackage).mockResolvedValue({} as any);
    mockGetBundledPackageByPkgKey.mockResolvedValue(undefined);
    jest.spyOn(licenseService, 'hasAtLeast').mockReturnValue(true);
    jest.spyOn(Registry, 'splitPkgKey').mockImplementation((pkgKey: string) => {
      const [pkgName, pkgVersion] = pkgKey.split('-');
      return { pkgName, pkgVersion };
    });
    jest
      .spyOn(Registry, 'pkgToPkgKey')
      .mockImplementation((pkg: { name: string; version: string }) => {
        return `${pkg.name}-${pkg.version}`;
      });
    jest
      .spyOn(Registry, 'fetchFindLatestPackageOrThrow')
      .mockImplementation(() => Promise.resolve({ version: '2.0.0' } as any));
    jest.spyOn(Registry, 'getPackage').mockImplementation((pkgName: string, pkgVersion: string) =>
      Promise.resolve({
        packageInfo: { name: pkgName, version: pkgVersion },
      } as any)
    );
  });
  const pkgName = 'test_package';

  it('should do nothing if error is ConcurrentInstallOperationError', async () => {
    const installedPkg: SavedObject<Installation> = {
      id: 'test-package',
      references: [],
      attributes: {
        name: pkgName,
        version: '1.0.0',
        install_version: '1.0.0',
        format_version: '1.0.0',
        title: 'Test Package',
        description: 'A package for testing',
        owner: {
          github: 'elastic',
        },
      },
    } as any;
    await handleInstallPackageFailure({
      savedObjectsClient,
      error: new ConcurrentInstallOperationError('test 123'),
      esClient: {} as ElasticsearchClient,
      installedPkg,
      pkgName,
      pkgVersion: '2.0.0',
      spaceId: 'default',
    });

    expect(mockedLogger.error).not.toBeCalled();
    expect(installStateMachine._stateMachineInstallPackage).not.toBeCalled();
  });

  it('should rollback on upgrade on FleetError', async () => {
    const installedPkg: SavedObject<Installation> = {
      id: 'test-package',
      references: [],
      attributes: {
        name: pkgName,
        version: '1.0.0',
        install_version: '1.0.0',
        format_version: '1.0.0',
        title: 'Test Package',
        description: 'A package for testing',
        owner: {
          github: 'elastic',
        },
      },
    } as any;
    jest.mocked(getInstallationObject).mockResolvedValueOnce(installedPkg);
    await handleInstallPackageFailure({
      savedObjectsClient,
      error: new FleetError('test 123'),
      esClient: {} as ElasticsearchClient,
      installedPkg,
      pkgName,
      pkgVersion: '2.0.0',
      spaceId: 'default',
    });

    expect(mockedLogger.error).toBeCalledTimes(1);
    expect(mockedLogger.error).toBeCalledWith(
      'Rolling back to test_package-1.0.0 after error installing test_package-2.0.0'
    );
    expect(installStateMachine._stateMachineInstallPackage).toBeCalledTimes(1);
    expect(installStateMachine._stateMachineInstallPackage).toBeCalledWith(
      expect.objectContaining({
        packageInstallContext: expect.objectContaining({
          packageInfo: expect.objectContaining({ name: pkgName, version: '1.0.0' }),
        }),
      })
    );
    jest.mocked(getInstallationObject).mockReset();
  });

  describe('when installtype is update', () => {
    it('should update the installation status to: install_failed on rollback error', async () => {
      jest
        .mocked(installStateMachine._stateMachineInstallPackage)
        .mockRejectedValue(new Error('test error'));

      const installedPkg: SavedObject<Installation> = {
        id: 'test-package',
        references: [],
        attributes: {
          name: pkgName,
          version: '1.0.0',
          install_version: '1.0.0',
          format_version: '1.0.0',
          title: 'Test Package',
          description: 'A package for testing',
          owner: {
            github: 'elastic',
          },
        },
      } as any;

      await handleInstallPackageFailure({
        savedObjectsClient,
        error: new Error('test 123'),
        esClient: {} as ElasticsearchClient,
        installedPkg,
        pkgName,
        pkgVersion: '2.0.0',
        spaceId: 'default',
      });

      expect(mockedLogger.error).toBeCalledWith(
        'Rolling back to test_package-1.0.0 after error installing test_package-2.0.0'
      );
      expect(mockedLogger.error).toBeCalledWith(
        'Uninstalling test_package-1.0.0 after error installing: [Error: test error] with install type: install'
      );
      expect(mockedLogger.error).toBeCalledWith(
        expect.stringMatching(/Failed to uninstall or rollback package after installation error/)
      );
      expect(installStateMachine._stateMachineInstallPackage).toBeCalledTimes(1);
      expect(installStateMachine._stateMachineInstallPackage).toBeCalledWith(
        expect.objectContaining({
          packageInstallContext: expect.objectContaining({
            packageInfo: expect.objectContaining({ name: pkgName, version: '1.0.0' }),
          }),
        })
      );
    });
  });

  describe('when installtype is install', () => {
    it('should do nothing when installedPkg is not present', async () => {
      jest
        .mocked(installStateMachine._stateMachineInstallPackage)
        .mockRejectedValue(new Error('test error'));

      await handleInstallPackageFailure({
        savedObjectsClient,
        error: new Error('test 123'),
        esClient: {} as ElasticsearchClient,
        installedPkg: undefined as any,
        pkgName,
        pkgVersion: '1.0.0',
        spaceId: 'default',
      });
      expect(mockedLogger.error).toBeCalledWith(
        'Uninstalling test_package-1.0.0 after error installing: [Error: test 123] with install type: install'
      );
      expect(mockedLogger.error).toBeCalledWith(
        `Failed to uninstall or rollback package after installation error PackageRemovalError: test_package is not installed`
      );
    });
  });

  describe('when installtype is reinstall', () => {
    it('should retry install from previous failed state', async () => {
      jest
        .mocked(installStateMachine._stateMachineInstallPackage)
        .mockRejectedValue(new Error('test error'));

      const installedPkg: SavedObject<Installation> = {
        id: 'test-package',
        references: [],
        attributes: {
          name: pkgName,
          version: '2.0.0',
          install_version: '2.0.0',
          format_version: '2.0.0',
          title: 'Test Package',
          description: 'A package for testing',
          owner: {
            github: 'elastic',
          },
        },
      } as any;

      await handleInstallPackageFailure({
        savedObjectsClient,
        error: new Error('test installing'),
        esClient: {} as ElasticsearchClient,
        installedPkg,
        pkgName,
        pkgVersion: '2.0.0',
        spaceId: 'default',
      });
      expect(mockedLogger.error).toBeCalledWith(
        'Error installing test_package-2.0.0: [Error: test installing]'
      );
      expect(mockedLogger.debug).toBeCalledWith(
        expect.stringMatching(
          /Retrying install of test_package-2.0.0 with install type: reinstall - Attempt 1/
        )
      );
      expect(mockedLogger.debug).toBeCalledWith(
        'Kicking off install of test_package-2.0.0 from registry'
      );
      expect(installStateMachine._stateMachineInstallPackage).toBeCalledTimes(1);
      expect(installStateMachine._stateMachineInstallPackage).toBeCalledWith(
        expect.objectContaining({
          retryFromLastState: true,
          packageInstallContext: expect.objectContaining({
            packageInfo: expect.objectContaining({
              name: pkgName,
              version: '2.0.0',
            }),
          }),
        })
      );
    });

    it('should retry install from previous failed state when MAX_REINSTALL_RETRIES is not reached', async () => {
      jest
        .mocked(installStateMachine._stateMachineInstallPackage)
        .mockRejectedValue(new Error('test error'));

      const installedPkg: SavedObject<Installation> = {
        id: 'test-package',
        references: [],
        attributes: {
          name: pkgName,
          version: '2.0.0',
          install_version: '2.0.0',
          format_version: '2.0.0',
          title: 'Test Package',
          description: 'A package for testing',
          owner: {
            github: 'elastic',
          },
          latest_install_failed_attempts: [
            {
              created_at: '2024-01-24T15:21:13.389Z',
              target_version: '2.0.0',
              error: { name: 'error', message: 'test error' },
            },
          ],
        },
      } as any;

      await handleInstallPackageFailure({
        savedObjectsClient,
        error: new Error('test installing'),
        esClient: {} as ElasticsearchClient,
        installedPkg,
        pkgName,
        pkgVersion: '2.0.0',
        spaceId: 'default',
      });

      expect(installStateMachine._stateMachineInstallPackage).toBeCalledTimes(1);
      expect(installStateMachine._stateMachineInstallPackage).toBeCalledWith(
        expect.objectContaining({
          retryFromLastState: true,
          packageInstallContext: expect.objectContaining({
            packageInfo: expect.objectContaining({
              name: pkgName,
              version: '2.0.0',
            }),
          }),
        })
      );
    });

    it('should not retry install from previous failed state and when 3 attempts have been done', async () => {
      jest
        .mocked(installStateMachine._stateMachineInstallPackage)
        .mockRejectedValue(new Error('test error'));

      const installedPkg: SavedObject<Installation> = {
        id: 'test-package',
        references: [],
        attributes: {
          name: pkgName,
          version: '2.0.0',
          install_version: '2.0.0',
          format_version: '2.0.0',
          title: 'Test Package',
          description: 'A package for testing',
          owner: {
            github: 'elastic',
          },
          latest_install_failed_attempts: [
            {
              created_at: '2024-01-24T15:21:13.389Z',
              target_version: '2.0.0',
              error: { name: 'error', message: 'test error' },
            },
            {
              created_at: '2024-01-24T18:21:19.389Z',
              target_version: '2.0.0',
              error: { name: 'error', message: 'test error 1' },
            },
            {
              created_at: '2024-01-24T19:25:13.379Z',
              target_version: '2.0.0',
              error: { name: 'error', message: 'test error' },
            },
          ],
        },
      } as any;

      await handleInstallPackageFailure({
        savedObjectsClient,
        error: new Error('test installing'),
        esClient: {} as ElasticsearchClient,
        installedPkg,
        pkgName,
        pkgVersion: '2.0.0',
        spaceId: 'default',
      });

      expect(installStateMachine._stateMachineInstallPackage).not.toBeCalled();
    });
  });
});

describe('isPackageVersionOrLaterInstalled', () => {
  beforeEach(() => {
    jest.mocked(getInstallationObject).mockReset();
  });
  it('should return true if package is installed in the same version as expected', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    jest.mocked(getInstallationObject).mockResolvedValueOnce({
      attributes: { name: 'test', version: '1.0.0', install_status: 'installed' },
    } as any);
    const res = await isPackageVersionOrLaterInstalled({
      savedObjectsClient,
      pkgName: 'test',
      pkgVersion: '1.0.0',
    });

    expect(res).toEqual(
      expect.objectContaining({
        package: expect.objectContaining({
          name: 'test',
          version: '1.0.0',
          install_status: 'installed',
        }),
      })
    );
  });

  it('should return true if package is installed in an higher version as expected', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    jest.mocked(getInstallationObject).mockResolvedValueOnce({
      attributes: { name: 'test', version: '1.2.0', install_status: 'installed' },
    } as any);
    const res = await isPackageVersionOrLaterInstalled({
      savedObjectsClient,
      pkgName: 'test',
      pkgVersion: '1.0.0',
    });

    expect(res).toEqual(
      expect.objectContaining({
        package: expect.objectContaining({
          name: 'test',
          version: '1.2.0',
          install_status: 'installed',
        }),
      })
    );
  });

  it('should return false if package is installed in an lower version as expected', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    jest.mocked(getInstallationObject).mockResolvedValueOnce({
      attributes: { name: 'test', version: '0.9.0', install_status: 'installed' },
    } as any);
    const res = await isPackageVersionOrLaterInstalled({
      savedObjectsClient,
      pkgName: 'test',
      pkgVersion: '1.0.0',
    });

    expect(res).toEqual(false);
  });

  it('should retry if package is currently installing', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    jest.mocked(getInstallationObject).mockResolvedValueOnce({
      attributes: { name: 'test', version: '1.0.0', install_status: 'installing' },
    } as any);
    jest.mocked(getInstallationObject).mockResolvedValueOnce({
      attributes: { name: 'test', version: '1.0.0', install_status: 'installing' },
    } as any);
    jest.mocked(getInstallationObject).mockResolvedValueOnce({
      attributes: { name: 'test', version: '1.0.0', install_status: 'installed' },
    } as any);

    const res = await isPackageVersionOrLaterInstalled({
      savedObjectsClient,
      pkgName: 'test',
      pkgVersion: '1.0.0',
    });

    expect(res).toEqual(
      expect.objectContaining({
        package: expect.objectContaining({
          name: 'test',
          version: '1.0.0',
          install_status: 'installed',
        }),
      })
    );

    expect(getInstallationObject).toBeCalledTimes(3);
  });

  it('should throw on unexpected error', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    jest.mocked(getInstallationObject).mockRejectedValueOnce(new Error('test unexpected error'));

    const res = isPackageVersionOrLaterInstalled({
      savedObjectsClient,
      pkgName: 'test',
      pkgVersion: '1.0.0',
    });

    await expect(res).rejects.toThrowError('test unexpected error');
  });
});

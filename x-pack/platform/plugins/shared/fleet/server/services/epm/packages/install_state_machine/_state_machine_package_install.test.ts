/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  ElasticsearchClient,
  SavedObject,
} from '@kbn/core/server';
import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { PackageSavedObjectConflictError } from '../../../../errors';
import { DatasetOwnershipConflictError } from '../dataset_ownership';

import type { Installation } from '../../../../../common';

import { INSTALL_STATES } from '../../../../../common/types';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common';

import { appContextService } from '../../../app_context';
import { createAppContextStartContractMock } from '../../../../mocks';
import { saveArchiveEntriesFromAssetsMap } from '../../archive/storage';

jest.mock('../../elasticsearch/template/template');
jest.mock('../../kibana/assets/install');
jest.mock('../../kibana/index_pattern/install');
jest.mock('../get');
jest.mock('../install_index_template_pipeline');

jest.mock('../../archive/storage');
jest.mock('../../elasticsearch/ilm/install');
jest.mock('../../elasticsearch/datastream_ilm/install');
jest.mock('../dataset_ownership');

import { updateCurrentWriteIndices } from '../../elasticsearch/template/template';

import { installIndexTemplatesAndPipelines } from '../install_index_template_pipeline';

import { createArchiveIteratorFromMap } from '../../archive/archive_iterator';

import { handleState } from './state_machine';
import {
  _stateMachineInstallPackage,
  regularStatesDefinition,
  streamingStatesDefinition,
} from './_state_machine_package_install';
import { cleanupLatestExecutedState, stepCreateRestartInstallation } from './steps';
import { enforceInstallDatasetOwnership } from '../dataset_ownership';

jest.mock('./state_machine');
jest.mock('../install');
jest.mock('./steps');

const mockedInstallIndexTemplatesAndPipelines =
  installIndexTemplatesAndPipelines as jest.MockedFunction<
    typeof installIndexTemplatesAndPipelines
  >;
const mockedUpdateCurrentWriteIndices = updateCurrentWriteIndices as jest.MockedFunction<
  typeof updateCurrentWriteIndices
>;
const mockCleanupLatestExecutedState = cleanupLatestExecutedState as jest.MockedFunction<
  typeof cleanupLatestExecutedState
>;
const mockHandleState = handleState as jest.MockedFunction<typeof handleState>;
const mockedEnforce = enforceInstallDatasetOwnership as jest.MockedFunction<
  typeof enforceInstallDatasetOwnership
>;

function sleep(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}

describe('_stateMachineInstallPackage', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;

  const baseContext = () => ({
    savedObjectsClient: soClient,
    savedObjectsImporter: jest.fn(),
    esClient,
    logger: loggerMock.create(),
    packageInstallContext: {
      archiveIterator: createArchiveIteratorFromMap(new Map()),
      paths: [],
      packageInfo: {
        title: 'title',
        name: 'xyz',
        version: '4.5.6',
        description: 'test',
        type: 'integration',
        categories: ['cloud', 'custom'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
      },
    },
    installType: 'install',
    installSource: 'registry',
    spaceId: DEFAULT_SPACE_ID,
  });

  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();

    soClient.update.mockImplementation(async (type, id, attributes) => {
      return { id, attributes } as any;
    });
    soClient.get.mockImplementation(async (type, id) => {
      return { id, attributes: {} } as any;
    });
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
    jest.mocked(saveArchiveEntriesFromAssetsMap).mockResolvedValue({
      saved_objects: [],
    });
    mockedEnforce.mockReset();
    mockedEnforce.mockResolvedValue({ ownedDataStreams: [], acquiredDatasetClaims: [] });
  });

  afterEach(() => {
    mockedInstallIndexTemplatesAndPipelines.mockReset();
    mockHandleState.mockClear();
  });

  it('Handles errors coming from handleState', async () => {
    // force errors from this function
    mockHandleState.mockImplementation(async () => {
      throw new Error('mocked async error A: should be caught');
    });

    // pick any function between when those are called and when await Promise.all is defined later
    // and force it to take long enough for the errors to occur
    // @ts-expect-error about call signature
    mockedUpdateCurrentWriteIndices.mockImplementation(async () => await sleep(1000));
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [],
      esReferences: [],
    });

    const installationPromise = _stateMachineInstallPackage({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext: {
        archiveIterator: createArchiveIteratorFromMap(new Map()),
        paths: [],
        packageInfo: {
          title: 'title',
          name: 'xyz',
          version: '4.5.6',
          description: 'test',
          type: 'integration',
          categories: ['cloud', 'custom'],
          format_version: 'string',
          release: 'experimental',
          conditions: { kibana: { version: 'x.y.z' } },
          owner: { github: 'elastic/fleet' },
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      datasetClaimAttemptId: 'attempt-1',
    });
    // if we have a .catch this will fail nicely (test pass)
    // otherwise the test will fail with either of the mocked errors
    await expect(installationPromise).rejects.toThrow('mocked');
    await expect(installationPromise).rejects.toThrow('should be caught');
  });

  describe('With flag retryFromLastState = true', () => {
    beforeEach(() => {
      mockHandleState.mockImplementation(() =>
        Promise.resolve({ installedKibanaAssetsRefs: [], esReferences: [] })
      );
    });
    afterEach(() => {
      mockCleanupLatestExecutedState.mockReset();
      mockHandleState.mockClear();
    });

    const mockInstalledPackageSo: SavedObject<Installation> = {
      id: 'mocked-package',
      attributes: {
        name: 'test-package',
        version: '1.0.0',
        install_status: 'installing',
        install_version: '1.0.0',
        install_started_at: new Date().toISOString(),
        install_source: 'registry',
        verification_status: 'verified',
        installed_kibana: [] as any,
        installed_es: [] as any,
        es_index_patterns: {},
      },
      type: PACKAGES_SAVED_OBJECT_TYPE,
      references: [],
    };

    it('If there is no latest_executed_state in SO, start from create_restart_installation', async () => {
      await _stateMachineInstallPackage({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext: {
          archiveIterator: createArchiveIteratorFromMap(new Map()),
          paths: [],
          packageInfo: {
            title: 'title',
            name: 'xyz',
            version: '4.5.6',
            description: 'test',
            type: 'integration',
            categories: ['cloud', 'custom'],
            format_version: 'string',
            release: 'experimental',
            conditions: { kibana: { version: 'x.y.z' } },
            owner: { github: 'elastic/fleet' },
          },
        },
        installType: 'install',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        datasetClaimAttemptId: 'attempt-1',
        retryFromLastState: true,
      });
      expect(mockCleanupLatestExecutedState).not.toBeCalled();
      expect(mockHandleState).toBeCalledWith(
        'create_restart_installation',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('If force is passed, always start from create_restart_installation', async () => {
      await _stateMachineInstallPackage({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext: {
          archiveIterator: createArchiveIteratorFromMap(new Map()),
          paths: [],
          packageInfo: {
            title: 'title',
            name: 'xyz',
            version: '4.5.6',
            description: 'test',
            type: 'integration',
            categories: ['cloud', 'custom'],
            format_version: 'string',
            release: 'experimental',
            conditions: { kibana: { version: 'x.y.z' } },
            owner: { github: 'elastic/fleet' },
          },
        },
        installType: 'install',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        datasetClaimAttemptId: 'attempt-1',
        retryFromLastState: true,
        force: true,
        installedPkg: {
          ...mockInstalledPackageSo,
          attributes: {
            ...mockInstalledPackageSo.attributes,
            install_started_at: new Date(Date.now() - 1000).toISOString(),
            latest_executed_state: {
              name: 'install_index_template_pipelines' as any,
              error: 'Some error',
              started_at: new Date(Date.now() - 100).toISOString(),
            },
          },
        },
      });
      expect(mockCleanupLatestExecutedState).not.toBeCalled();
      expect(mockHandleState).toBeCalledWith(
        'create_restart_installation',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('If there is latest_executed_state in SO, start from latest failed state', async () => {
      await _stateMachineInstallPackage({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext: {
          archiveIterator: createArchiveIteratorFromMap(new Map()),
          paths: [],
          packageInfo: {
            title: 'title',
            name: 'xyz',
            version: '4.5.6',
            description: 'test',
            type: 'integration',
            categories: ['cloud', 'custom'],
            format_version: 'string',
            release: 'experimental',
            conditions: { kibana: { version: 'x.y.z' } },
            owner: { github: 'elastic/fleet' },
          },
        },
        installType: 'install',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        datasetClaimAttemptId: 'attempt-1',
        retryFromLastState: true,
        installedPkg: {
          ...mockInstalledPackageSo,
          attributes: {
            ...mockInstalledPackageSo.attributes,
            install_started_at: new Date(Date.now() - 1000).toISOString(),
            latest_executed_state: {
              name: 'install_index_template_pipelines' as any,
              error: 'Some error',
              started_at: new Date(Date.now() - 100).toISOString(),
            },
          },
        },
      });
      expect(mockCleanupLatestExecutedState).toBeCalled();
      expect(mockHandleState).toBeCalledWith(
        'remove_legacy_templates',
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  it('Surfaces saved object conflicts error', async () => {
    mockHandleState.mockRejectedValueOnce(new PackageSavedObjectConflictError('test'));

    appContextService.start(
      createAppContextStartContractMock({
        internal: {
          disableILMPolicies: false,
          fleetServerStandalone: false,
          onlyAllowAgentUpgradeToKnownVersions: false,
          retrySetupOnBoot: false,
          registry: {
            kibanaVersionCheckEnabled: true,
            capabilities: [],
            excludePackages: [],
          },
        },
      })
    );

    const installPromise = _stateMachineInstallPackage({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext: {
        packageInfo: {
          title: 'title',
          name: 'xyz',
          version: '4.5.6',
          description: 'test',
          type: 'integration',
          categories: ['cloud', 'custom'],
          format_version: 'string',
          release: 'experimental',
          conditions: { kibana: { version: 'x.y.z' } },
          owner: { github: 'elastic/fleet' },
        } as any,
        archiveIterator: createArchiveIteratorFromMap(new Map()),
        paths: [],
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      datasetClaimAttemptId: 'attempt-1',
    });
    await expect(installPromise).rejects.toThrowError(PackageSavedObjectConflictError);
  });

  it('enforces ownership before any state runs, even when resuming late', async () => {
    mockedEnforce.mockResolvedValue({
      ownedDataStreams: ['logs-mine.data-default'],
      acquiredDatasetClaims: ['logs-mine.data'],
    });
    mockHandleState.mockResolvedValue({ installedKibanaAssetsRefs: [], esReferences: [] });

    await _stateMachineInstallPackage({
      ...baseContext(),
      datasetClaimAttemptId: 'attempt-1',
      retryFromLastState: true,
      force: false,
      installedPkg: {
        attributes: { latest_executed_state: { name: INSTALL_STATES.REMOVE_LEGACY_TEMPLATES } },
      },
    } as never);

    expect(mockedEnforce).toHaveBeenCalled();
  });

  it('keeps the real resume target so retry cleanup still triggers', async () => {
    mockedEnforce.mockResolvedValue({ ownedDataStreams: [], acquiredDatasetClaims: [] });
    mockHandleState.mockResolvedValue({ installedKibanaAssetsRefs: [], esReferences: [] });

    await _stateMachineInstallPackage({
      ...baseContext(),
      datasetClaimAttemptId: 'attempt-1',
      retryFromLastState: true,
      force: false,
      installedPkg: {
        attributes: { latest_executed_state: { name: INSTALL_STATES.INSTALL_ML_MODEL } },
      },
    } as never);

    expect(mockHandleState).toHaveBeenCalledWith(
      INSTALL_STATES.INSTALL_INDEX_TEMPLATE_PIPELINES,
      expect.anything(),
      expect.objectContaining({ initialState: INSTALL_STATES.INSTALL_INDEX_TEMPLATE_PIPELINES })
    );
  });

  it('passes the allowlist into the state context', async () => {
    mockedEnforce.mockResolvedValue({
      ownedDataStreams: ['logs-mine.data-default'],
      acquiredDatasetClaims: ['logs-mine.data'],
    });
    mockHandleState.mockResolvedValue({ installedKibanaAssetsRefs: [], esReferences: [] });

    await _stateMachineInstallPackage({
      ...baseContext(),
      datasetClaimAttemptId: 'attempt-1',
    } as never);

    expect(mockHandleState).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        ownedDataStreams: ['logs-mine.data-default'],
        acquiredDatasetClaims: ['logs-mine.data'],
      })
    );
  });

  it('does not enforce ownership for a streaming install, which installs no ES templates', async () => {
    mockHandleState.mockResolvedValue({ installedKibanaAssetsRefs: [], esReferences: [] });

    await _stateMachineInstallPackage({ ...baseContext(), useStreaming: true } as never);

    expect(mockedEnforce).not.toHaveBeenCalled();
  });

  it('rejects before any state runs when ownership resolution fails', async () => {
    mockedEnforce.mockRejectedValue(new DatasetOwnershipConflictError('nope'));

    await expect(
      _stateMachineInstallPackage({
        ...baseContext(),
        datasetClaimAttemptId: 'attempt-1',
      } as never)
    ).rejects.toBeInstanceOf(DatasetOwnershipConflictError);
    expect(mockHandleState).not.toHaveBeenCalled();
  });

  it('refuses a non-streaming install with no attempt id', async () => {
    await expect(_stateMachineInstallPackage(baseContext() as never)).rejects.toThrow(
      /attempt id/i
    );
  });

  it('creates the package SO under the ownership lock before later states run', async () => {
    mockedEnforce.mockImplementation(async (opts) => {
      await opts.afterAcquire?.();
      return { ownedDataStreams: [], acquiredDatasetClaims: [] };
    });
    mockHandleState.mockResolvedValue({ installedKibanaAssetsRefs: [], esReferences: [] });
    const mockCreateRestart = stepCreateRestartInstallation as jest.MockedFunction<
      typeof stepCreateRestartInstallation
    >;
    mockCreateRestart.mockResolvedValue(undefined as never);

    await _stateMachineInstallPackage({
      ...baseContext(),
      datasetClaimAttemptId: 'attempt-1',
    } as never);

    expect(mockCreateRestart).toHaveBeenCalled();
    expect(mockHandleState).toHaveBeenCalledWith(
      INSTALL_STATES.RESOLVE_DEPENDENCIES,
      expect.anything(),
      expect.objectContaining({ initialState: INSTALL_STATES.RESOLVE_DEPENDENCIES })
    );
  });

  it('does not recreate the package SO when one already exists', async () => {
    mockedEnforce.mockImplementation(async (opts) => {
      await opts.afterAcquire?.();
      return { ownedDataStreams: [], acquiredDatasetClaims: [] };
    });
    mockHandleState.mockResolvedValue({ installedKibanaAssetsRefs: [], esReferences: [] });
    const mockCreateRestart = stepCreateRestartInstallation as jest.MockedFunction<
      typeof stepCreateRestartInstallation
    >;
    mockCreateRestart.mockClear();

    await _stateMachineInstallPackage({
      ...baseContext(),
      datasetClaimAttemptId: 'attempt-1',
      installedPkg: { attributes: { name: 'xyz' } },
    } as never);

    expect(mockCreateRestart).not.toHaveBeenCalled();
    expect(mockHandleState).toHaveBeenCalledWith(
      INSTALL_STATES.CREATE_RESTART_INSTALLATION,
      expect.anything(),
      expect.anything()
    );
  });
});

describe('State machine parity', () => {
  it('should have matching isAsync flags for common states in both regularStatesDefinition and streamingStatesDefinition', () => {
    const commonStates = [
      'create_restart_installation',
      'install_kibana_assets',
      'save_archive_entries_from_assets_map',
      'save_knowledge_base',
      'update_so',
    ] as const;

    commonStates.forEach((stateName) => {
      const regularState = regularStatesDefinition[stateName];
      const streamingState = streamingStatesDefinition[stateName];

      if (regularState && streamingState) {
        expect(regularState.isAsync).toEqual(streamingState.isAsync);
      }
    });
  });
});

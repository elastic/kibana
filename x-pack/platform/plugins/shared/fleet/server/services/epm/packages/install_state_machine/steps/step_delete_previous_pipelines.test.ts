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
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../../common/constants';
import { ElasticsearchAssetType } from '../../../../../types';

import type { EsAssetReference, Installation } from '../../../../../../common';
import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';
import {
  isTopLevelPipeline,
  deletePreviousPipelines,
} from '../../../elasticsearch/ingest_pipeline';

import { createArchiveIteratorFromMap } from '../../../archive/archive_iterator';

import { stepDeletePreviousPipelines } from './step_delete_previous_pipelines';

jest.mock('../../../elasticsearch/ingest_pipeline');

const mockedDeletePreviousPipelines = deletePreviousPipelines as jest.MockedFunction<
  typeof deletePreviousPipelines
>;
const mockedIsTopLevelPipeline = isTopLevelPipeline as jest.MockedFunction<
  typeof isTopLevelPipeline
>;

describe('stepDeletePreviousPipelines', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let esClient: jest.Mocked<ElasticsearchClient>;
  const getMockInstalledPackageSo = (
    installedEs: EsAssetReference[] = []
  ): SavedObject<Installation> => {
    return {
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
        installed_es: installedEs,
        es_index_patterns: {},
      },
      type: PACKAGES_SAVED_OBJECT_TYPE,
      references: [],
    };
  };
  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });
  afterEach(async () => {
    jest.mocked(mockedDeletePreviousPipelines).mockReset();
    jest.mocked(mockedIsTopLevelPipeline).mockReset();
  });

  describe('Should call deletePreviousPipelines', () => {
    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'test-package',
        version: '1.0.0',
        description: 'test',
        type: 'integration',
        categories: ['cloud', 'custom'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
      } as any,
      assetsMap: new Map(),
      archiveIterator: createArchiveIteratorFromMap(new Map()),
      paths: [],
    };
    appContextService.start(
      createAppContextStartContractMock({
        internal: {
          disableILMPolicies: true,
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
    const mockInstalledPackageSo = getMockInstalledPackageSo();
    const installedPkg = {
      ...mockInstalledPackageSo,
      attributes: {
        ...mockInstalledPackageSo.attributes,
        install_started_at: new Date(Date.now() - 1000).toISOString(),
      },
    };
    beforeEach(async () => {
      jest.mocked(mockedDeletePreviousPipelines).mockResolvedValue([
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
        {
          id: 'something-01',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ]);
    });

    it('if installType is update', async () => {
      const res = await stepDeletePreviousPipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext,
        installedPkg,
        installType: 'update',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });

      expect(mockedDeletePreviousPipelines).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        installedPkg.attributes.name,
        installedPkg.attributes.version,
        [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ]
      );
      expect(res).toEqual({
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
          {
            id: 'something-01',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });
    });

    it('if installType is reupdate', async () => {
      const res = await stepDeletePreviousPipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext,
        installedPkg,
        installType: 'reupdate',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });

      expect(mockedDeletePreviousPipelines).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        installedPkg.attributes.name,
        installedPkg.attributes.version,
        [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ]
      );
      expect(res).toEqual({
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
          {
            id: 'something-01',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });
    });

    it('if installType is rollback', async () => {
      const res = await stepDeletePreviousPipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext,
        installedPkg,
        installType: 'rollback',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });

      expect(mockedDeletePreviousPipelines).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        installedPkg.attributes.name,
        installedPkg.attributes.version,
        [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ]
      );
      expect(res).toEqual({
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
          {
            id: 'something-01',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });
    });
  });

  describe('Should not call deletePreviousPipelines', () => {
    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'test-package',
        version: '1.0.0',
        description: 'test',
        type: 'integration',
        categories: ['cloud', 'custom'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
      } as any,
      assetsMap: new Map(),
      archiveIterator: createArchiveIteratorFromMap(new Map()),
      paths: [],
    };
    appContextService.start(
      createAppContextStartContractMock({
        internal: {
          disableILMPolicies: true,
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
    beforeEach(async () => {
      jest.mocked(mockedDeletePreviousPipelines).mockResolvedValue([
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
        {
          id: 'something-01',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ]);
    });

    it('if installType is update and installedPkg is not present', async () => {
      const res = await stepDeletePreviousPipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext,
        installType: 'update',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });

      expect(mockedDeletePreviousPipelines).not.toBeCalled();
      expect(res).toEqual({
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });
    });

    it('if installType is reupdate and installedPkg is not present', async () => {
      const res = await stepDeletePreviousPipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext,
        installType: 'reupdate',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });

      expect(mockedDeletePreviousPipelines).not.toBeCalled();
      expect(res).toEqual({
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });
    });

    it('if installType is rollback and installedPkg is not present', async () => {
      const res = await stepDeletePreviousPipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext,
        installType: 'rollback',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });

      expect(mockedDeletePreviousPipelines).not.toBeCalled();
      expect(res).toEqual({
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });
    });

    it('if installType type is of different type', async () => {
      const mockInstalledPackageSo = getMockInstalledPackageSo();
      const installedPkg = {
        ...mockInstalledPackageSo,
        attributes: {
          ...mockInstalledPackageSo.attributes,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      };
      jest.mocked(mockedIsTopLevelPipeline).mockImplementation(() => true);

      const res = await stepDeletePreviousPipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext: { ...packageInstallContext, paths: ['some/path/1', 'some/path/2'] },
        installType: 'install',
        installedPkg,
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });

      expect(mockedDeletePreviousPipelines).not.toBeCalled();
      expect(res).toEqual({
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });
    });

    it('if installedPkg is present and there is a top level pipeline', async () => {
      const mockInstalledPackageSo = getMockInstalledPackageSo();
      const installedPkg = {
        ...mockInstalledPackageSo,
        attributes: {
          ...mockInstalledPackageSo.attributes,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      };
      jest.mocked(mockedIsTopLevelPipeline).mockImplementation(() => true);

      const res = await stepDeletePreviousPipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext: { ...packageInstallContext, paths: ['some/path/1', 'some/path/2'] },
        installType: 'update',
        installedPkg,
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });

      expect(mockedDeletePreviousPipelines).not.toBeCalled();
      expect(res).toEqual({
        esReferences: [
          {
            id: 'something',
            type: ElasticsearchAssetType.ilmPolicy,
          },
        ],
      });
    });
  });
});

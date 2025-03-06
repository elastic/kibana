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
import { installIndexTemplatesAndPipelines } from '../../install_index_template_pipeline';
import { deletePrerequisiteAssets, cleanupComponentTemplate } from '../../remove';

jest.mock('../../install_index_template_pipeline');
jest.mock('../../remove', () => {
  return {
    ...jest.requireActual('../../remove'),
    deletePrerequisiteAssets: jest.fn(),
    cleanupComponentTemplate: jest.fn(),
  };
});
const mockCleanupComponentTemplate = cleanupComponentTemplate as jest.MockedFunction<
  typeof cleanupComponentTemplate
>;
const mockDeletePrerequisiteAssets = deletePrerequisiteAssets as jest.MockedFunction<
  typeof deletePrerequisiteAssets
>;

import { createArchiveIteratorFromMap } from '../../../archive/archive_iterator';

import {
  stepInstallIndexTemplatePipelines,
  cleanupIndexTemplatePipelinesStep,
} from './step_install_index_template_pipelines';
const mockedInstallIndexTemplatesAndPipelines =
  installIndexTemplatesAndPipelines as jest.MockedFunction<
    typeof installIndexTemplatesAndPipelines
  >;
let soClient: jest.Mocked<SavedObjectsClientContract>;
let esClient: jest.Mocked<ElasticsearchClient>;

describe('stepInstallIndexTemplatePipelines', () => {
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
    jest.mocked(mockedInstallIndexTemplatesAndPipelines).mockReset();
  });

  it('Should call installIndexTemplatesAndPipelines if packageInfo type is integration', async () => {
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [
        {
          templateName: 'template-01',
          indexTemplate: {
            priority: 1,
            index_patterns: [],
            template: {
              settings: {},
              mappings: {},
            },
            data_stream: { hidden: false },
            composed_of: [],
            _meta: {},
          },
        },
      ],
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
    const packageInstallContext = {
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
    const mockInstalledPackageSo = getMockInstalledPackageSo([
      {
        id: 'something',
        type: ElasticsearchAssetType.ilmPolicy,
      },
    ]);
    const installedPkg = {
      ...mockInstalledPackageSo,
      attributes: {
        ...mockInstalledPackageSo.attributes,
        install_started_at: new Date(Date.now() - 1000).toISOString(),
      },
    };
    const res = await stepInstallIndexTemplatePipelines({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg,
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });

    expect(mockedInstallIndexTemplatesAndPipelines).toHaveBeenCalledWith({
      installedPkg: installedPkg.attributes,
      packageInstallContext: expect.any(Object),
      esClient: expect.any(Object),
      savedObjectsClient: expect.any(Object),
      logger: expect.any(Object),
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
    expect(res).toEqual({
      indexTemplates: [
        {
          templateName: 'template-01',
          indexTemplate: {
            priority: 1,
            index_patterns: [],
            template: {
              settings: {},
              mappings: {},
            },
            data_stream: { hidden: false },
            composed_of: [],
            _meta: {},
          },
        },
      ],
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

  it('Should call installIndexTemplatesAndPipelines if packageInfo type is input and installedPkg exists', async () => {
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [
        {
          templateName: 'template-01',
          indexTemplate: {
            priority: 1,
            index_patterns: [],
            template: {
              settings: {},
              mappings: {},
            },
            data_stream: { hidden: false },
            composed_of: [],
            _meta: {},
          },
        },
      ],
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
    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'xyz',
        version: '4.5.6',
        description: 'test',
        type: 'input',
        categories: ['cloud'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
        policy_templates: [
          {
            name: 'template_0001',
            title: 'Template 1',
            description: 'Template 1',
            inputs: [
              {
                type: 'logs',
                title: 'Log',
                description: 'Log Input',
                vars: [
                  {
                    name: 'path',
                    type: 'text',
                  },
                  {
                    name: 'path_2',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
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
    const mockInstalledPackageSo = getMockInstalledPackageSo([
      {
        id: 'something',
        type: ElasticsearchAssetType.ilmPolicy,
      },
      {
        id: 'type-template_0001',
        type: ElasticsearchAssetType.indexTemplate,
      },
    ]);
    const installedPkg = {
      ...mockInstalledPackageSo,
      attributes: {
        ...mockInstalledPackageSo.attributes,
        install_started_at: new Date(Date.now() - 1000).toISOString(),
      },
    };
    const res = await stepInstallIndexTemplatePipelines({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg,
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });

    expect(res).toEqual({
      indexTemplates: [
        {
          templateName: 'template-01',
          indexTemplate: {
            priority: 1,
            index_patterns: [],
            template: {
              settings: {},
              mappings: {},
            },
            data_stream: { hidden: false },
            composed_of: [],
            _meta: {},
          },
        },
      ],
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

  it('Should not call installIndexTemplatesAndPipelines if packageInfo type is input and no data streams are found', async () => {
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [
        {
          templateName: 'template-01',
          indexTemplate: {
            priority: 1,
            index_patterns: [],
            template: {
              settings: {},
              mappings: {},
            },
            data_stream: { hidden: false },
            composed_of: [],
            _meta: {},
          },
        },
      ],
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
    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'xyz',
        version: '4.5.6',
        description: 'test',
        type: 'input',
        categories: ['cloud'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
        policy_templates: [
          {
            name: 'template_0001',
            title: 'Template 1',
            description: 'Template 1',
            inputs: [
              {
                type: 'logs',
                title: 'Log',
                description: 'Log Input',
                vars: [
                  {
                    name: 'path',
                    type: 'text',
                  },
                  {
                    name: 'path_2',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
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
    const mockInstalledPackageSo = getMockInstalledPackageSo([
      {
        id: 'something',
        type: ElasticsearchAssetType.ilmPolicy,
      },
    ]);
    const installedPkg = {
      ...mockInstalledPackageSo,
      attributes: {
        ...mockInstalledPackageSo.attributes,
        install_started_at: new Date(Date.now() - 1000).toISOString(),
      },
    };
    await stepInstallIndexTemplatePipelines({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg,
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
    expect(mockedInstallIndexTemplatesAndPipelines).not.toBeCalled();
  });

  it('Should not call installIndexTemplatesAndPipelines if packageInfo type is input and installedPkg does not exist', async () => {
    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'xyz',
        version: '4.5.6',
        description: 'test',
        type: 'input',
        categories: ['cloud'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
        policy_templates: [
          {
            name: 'template_0001',
            title: 'Template 1',
            description: 'Template 1',
            inputs: [
              {
                type: 'logs',
                title: 'Log',
                description: 'Log Input',
                vars: [
                  {
                    name: 'path',
                    type: 'text',
                  },
                  {
                    name: 'path_2',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
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

    await stepInstallIndexTemplatePipelines({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [
        {
          id: 'something',
          type: ElasticsearchAssetType.ilmPolicy,
        },
      ],
    });
    expect(mockedInstallIndexTemplatesAndPipelines).not.toBeCalled();
  });

  it('Should not call installIndexTemplatesAndPipelines if packageInfo type is undefined', async () => {
    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'xyz',
        version: '4.5.6',
        description: 'test',
        type: undefined,
        categories: ['cloud'],
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

    await stepInstallIndexTemplatePipelines({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      esReferences: [],
    });
    expect(mockedInstallIndexTemplatesAndPipelines).not.toBeCalled();
  });
});

describe('cleanupIndexTemplatePipelinesStep', () => {
  const packageInstallContext = {
    packageInfo: {
      title: 'title',
      name: 'xyz',
      version: '4.5.6',
      description: 'test',
      type: 'input',
      categories: ['cloud'],
      format_version: 'string',
      release: 'experimental',
      conditions: { kibana: { version: 'x.y.z' } },
      owner: { github: 'elastic/fleet' },
      policy_templates: [
        {
          name: 'template_0001',
          title: 'Template 1',
          description: 'Template 1',
          inputs: [
            {
              type: 'logs',
              title: 'Log',
              description: 'Log Input',
              vars: [
                {
                  name: 'path',
                  type: 'text',
                },
                {
                  name: 'path_2',
                  type: 'text',
                },
              ],
            },
          ],
        },
      ],
    } as any,
    assetsMap: new Map(),
    archiveIterator: createArchiveIteratorFromMap(new Map()),
    paths: [],
  };
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

  beforeEach(async () => {
    soClient = savedObjectsClientMock.create();
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    appContextService.start(createAppContextStartContractMock());
  });
  afterEach(async () => {
    mockCleanupComponentTemplate.mockReset();
    mockDeletePrerequisiteAssets.mockReset();
  });
  const installedEs = [
    {
      id: 'metrics-endpoint.policy-0.1.0-dev.0',
      type: ElasticsearchAssetType.ingestPipeline,
    },
    {
      id: 'endpoint.metadata_current-default-0.1.0',
      type: ElasticsearchAssetType.transform,
    },
    {
      id: 'logs-endpoint.metadata_current-template',
      type: ElasticsearchAssetType.indexTemplate,
      version: '0.2.0',
    },
    {
      id: '.metrics-endpoint.metadata_united_default',
      type: ElasticsearchAssetType.index,
    },
    {
      id: '.metrics-endpoint.metadata_united_default-1',
      type: ElasticsearchAssetType.index,
    },
  ];

  it('should clean up prerequisite assets', async () => {
    await cleanupIndexTemplatePipelinesStep({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg: {
        ...mockInstalledPackageSo,
        attributes: {
          ...mockInstalledPackageSo.attributes,
          installed_es: installedEs as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      retryFromLastState: true,
      initialState: 'install_index_template_pipelines' as any,
    });

    expect(mockDeletePrerequisiteAssets).toBeCalledWith(
      {
        indexAssets: [
          {
            id: '.metrics-endpoint.metadata_united_default',
            type: ElasticsearchAssetType.index,
          },
          {
            id: '.metrics-endpoint.metadata_united_default-1',
            type: ElasticsearchAssetType.index,
          },
        ],
        transformAssets: [
          {
            id: 'endpoint.metadata_current-default-0.1.0',
            type: ElasticsearchAssetType.transform,
          },
        ],
        indexTemplatesAndPipelines: [
          {
            id: 'metrics-endpoint.policy-0.1.0-dev.0',
            type: ElasticsearchAssetType.ingestPipeline,
          },
          {
            id: 'logs-endpoint.metadata_current-template',
            type: ElasticsearchAssetType.indexTemplate,
            version: '0.2.0',
          },
        ],
      },
      esClient
    );
    expect(mockCleanupComponentTemplate).toBeCalledWith(installedEs, esClient);
  });

  it('should not clean up assets if force is passed', async () => {
    await cleanupIndexTemplatePipelinesStep({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg: {
        ...mockInstalledPackageSo,
        attributes: {
          ...mockInstalledPackageSo.attributes,
          installed_es: installedEs as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      force: true,
      retryFromLastState: true,
      initialState: 'install_index_template_pipelines' as any,
    });

    expect(mockCleanupComponentTemplate).not.toBeCalled();
    expect(mockDeletePrerequisiteAssets).not.toBeCalled();
  });

  it('should not clean up assets if retryFromLastState is not passed', async () => {
    await cleanupIndexTemplatePipelinesStep({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg: {
        ...mockInstalledPackageSo,
        attributes: {
          ...mockInstalledPackageSo.attributes,
          installed_es: installedEs as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      initialState: 'install_ilm_policies' as any,
    });

    expect(mockCleanupComponentTemplate).not.toBeCalled();
    expect(mockDeletePrerequisiteAssets).not.toBeCalled();
  });

  it('should not clean up assets if initialState != install_index_template_pipelines', async () => {
    await cleanupIndexTemplatePipelinesStep({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg: {
        ...mockInstalledPackageSo,
        attributes: {
          ...mockInstalledPackageSo.attributes,
          installed_es: installedEs as any,
          install_started_at: new Date(Date.now() - 1000).toISOString(),
        },
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      retryFromLastState: true,
      initialState: 'create_restart_install' as any,
    });

    expect(mockCleanupComponentTemplate).not.toBeCalled();
    expect(mockDeletePrerequisiteAssets).not.toBeCalled();
  });

  it('should not clean up assets if attributes are not present', async () => {
    await cleanupIndexTemplatePipelinesStep({
      savedObjectsClient: soClient,
      // @ts-ignore
      savedObjectsImporter: jest.fn(),
      esClient,
      logger: loggerMock.create(),
      packageInstallContext,
      installedPkg: {
        ...mockInstalledPackageSo,
        attributes: {} as any,
      },
      installType: 'install',
      installSource: 'registry',
      spaceId: DEFAULT_SPACE_ID,
      retryFromLastState: true,
      initialState: 'install_index_template_pipelines' as any,
    });

    expect(mockCleanupComponentTemplate).not.toBeCalled();
    expect(mockDeletePrerequisiteAssets).not.toBeCalled();
  });
});

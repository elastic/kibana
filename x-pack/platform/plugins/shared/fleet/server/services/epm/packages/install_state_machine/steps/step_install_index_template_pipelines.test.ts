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

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../../common/constants';
import { ElasticsearchAssetType } from '../../../../../types';

import type { EsAssetReference, Installation } from '../../../../../../common';
import { appContextService } from '../../../../app_context';
import { createAppContextStartContractMock } from '../../../../../mocks';
import { installIndexTemplatesAndPipelines } from '../../install_index_template_pipeline';
import { optimisticallyAddEsAssetReferences } from '../../es_assets_reference';
import { deletePrerequisiteAssets, cleanupComponentTemplate } from '../../remove';

jest.mock('../../install_index_template_pipeline');
jest.mock('../../es_assets_reference');
jest.mock('../../remove', () => {
  return {
    ...jest.requireActual('../../remove'),
    deletePrerequisiteAssets: jest.fn(),
    cleanupComponentTemplate: jest.fn(),
  };
});
jest.mock('../../../elasticsearch/template/template', () => ({
  generateESIndexPatterns: jest.fn((dataStreams) => {
    const result: Record<string, string> = {};
    for (const ds of dataStreams) {
      result[ds.path] = `${ds.type}-${ds.path}-*`;
    }
    return result;
  }),
}));
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
    jest.mocked(optimisticallyAddEsAssetReferences).mockReset();
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

  it('passes concrete data stream type from index template id for dynamic_signal_types input packages', async () => {
    mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
      installedTemplates: [],
      esReferences: [],
    });

    const packageInstallContext = {
      packageInfo: {
        title: 'title',
        name: 'sql_server_input_otel',
        version: '1.0.0',
        description: 'test',
        type: 'input',
        categories: ['cloud'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
        policy_templates: [
          {
            name: 'otel',
            title: 'OTel',
            description: 'OpenTelemetry',
            input: 'otelcol',
            template_path: 'input.yml.hbs',
            dynamic_signal_types: true,
            vars: [],
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
        id: 'logs-sql_server_input_otel.data',
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
      esReferences: [],
    });

    expect(mockedInstallIndexTemplatesAndPipelines).toHaveBeenCalledTimes(1);
    const callArg = mockedInstallIndexTemplatesAndPipelines.mock.calls[0][0];
    expect(callArg.onlyForDataStreams).toBeDefined();
    expect(callArg.onlyForDataStreams!.length).toBeGreaterThan(0);
    expect(callArg.onlyForDataStreams!.every((ds) => ds.type === 'logs')).toBe(true);
    expect(
      callArg.onlyForDataStreams!.every((ds) => ds.dataset === 'sql_server_input_otel.data')
    ).toBe(true);
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

  describe('reinstall custom dataset templates during upgrade', () => {
    const makeIntegrationContext = (dataStreams: any[] = []) => ({
      packageInfo: {
        title: 'title',
        name: 'test-package',
        version: '2.0.0',
        description: 'test',
        type: 'integration',
        categories: ['cloud', 'custom'],
        format_version: 'string',
        release: 'experimental',
        conditions: { kibana: { version: 'x.y.z' } },
        owner: { github: 'elastic/fleet' },
        data_streams: dataStreams,
      } as any,
      assetsMap: new Map(),
      archiveIterator: createArchiveIteratorFromMap(new Map()),
      paths: [],
    });

    it('should reinstall custom dataset templates when upgrading an integration package', async () => {
      const dataStreams = [{ dataset: 'test-package.access', type: 'logs', path: 'access' }];

      const standardRefs = [
        { id: 'logs-test-package.access', type: ElasticsearchAssetType.indexTemplate },
      ];
      const updatedRefsWithCustom = [
        ...standardRefs,
        {
          id: 'logs-my_custom_access',
          type: ElasticsearchAssetType.indexTemplate,
          customDataStreamOriginDataset: 'test-package.access',
          customDataStreamOriginType: 'logs',
        },
      ];

      mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
        installedTemplates: [],
        esReferences: standardRefs,
      });

      jest
        .mocked(optimisticallyAddEsAssetReferences)
        .mockResolvedValue(updatedRefsWithCustom as any);

      const mockInstalledPackageSo = getMockInstalledPackageSo([
        {
          id: 'logs-test-package.access',
          type: ElasticsearchAssetType.indexTemplate,
        },
        {
          id: 'logs-my_custom_access',
          type: ElasticsearchAssetType.indexTemplate,
          customDataStreamOriginDataset: 'test-package.access',
          customDataStreamOriginType: 'logs',
        },
      ]);

      const result = await stepInstallIndexTemplatePipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext: makeIntegrationContext(dataStreams),
        installedPkg: mockInstalledPackageSo,
        installType: 'update',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [],
      });

      expect(mockedInstallIndexTemplatesAndPipelines).toHaveBeenCalledTimes(2);

      const secondCall = mockedInstallIndexTemplatesAndPipelines.mock.calls[1][0];
      expect(secondCall.onlyForDataStreams).toHaveLength(1);
      expect(secondCall.onlyForDataStreams![0].dataset).toBe('my_custom_access');
      expect(secondCall.onlyForDataStreams![0].type).toBe('logs');
      expect(secondCall.onlyForDataStreams![0].path).toBe('access');
      expect(secondCall.customDataStreamOriginDataset).toBe('test-package.access');
      expect(secondCall.customDataStreamOriginType).toBe('logs');

      expect(jest.mocked(optimisticallyAddEsAssetReferences)).toHaveBeenCalledWith(
        soClient,
        'test-package',
        [],
        { my_custom_access: 'logs-my_custom_access-*' }
      );

      expect(result?.esReferences).toEqual(updatedRefsWithCustom);
    });

    it('should skip if no custom dataset refs exist in installed_es', async () => {
      const dataStreams = [{ dataset: 'test-package.access', type: 'logs', path: 'access' }];

      mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
        installedTemplates: [],
        esReferences: [],
      });

      const mockInstalledPackageSo = getMockInstalledPackageSo([
        {
          id: 'logs-test-package.access',
          type: ElasticsearchAssetType.indexTemplate,
        },
      ]);

      await stepInstallIndexTemplatePipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext: makeIntegrationContext(dataStreams),
        installedPkg: mockInstalledPackageSo,
        installType: 'update',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [],
      });

      expect(mockedInstallIndexTemplatesAndPipelines).toHaveBeenCalledTimes(1);
    });

    it('should skip if package has no matching data stream for the origin dataset', async () => {
      const dataStreams = [{ dataset: 'test-package.other', type: 'metrics', path: 'other' }];

      mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
        installedTemplates: [],
        esReferences: [],
      });

      const mockInstalledPackageSo = getMockInstalledPackageSo([
        {
          id: 'logs-my_custom_access',
          type: ElasticsearchAssetType.indexTemplate,
          customDataStreamOriginDataset: 'test-package.access',
          customDataStreamOriginType: 'logs',
        },
      ]);

      await stepInstallIndexTemplatePipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext: makeIntegrationContext(dataStreams),
        installedPkg: mockInstalledPackageSo,
        installType: 'update',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [],
      });

      expect(mockedInstallIndexTemplatesAndPipelines).toHaveBeenCalledTimes(1);
    });

    it('should continue upgrade even if custom dataset reinstallation fails', async () => {
      const dataStreams = [{ dataset: 'test-package.access', type: 'logs', path: 'access' }];

      mockedInstallIndexTemplatesAndPipelines
        .mockResolvedValueOnce({
          installedTemplates: [],
          esReferences: [],
        })
        .mockRejectedValueOnce(new Error('ES error'));

      const mockInstalledPackageSo = getMockInstalledPackageSo([
        {
          id: 'logs-my_custom_access',
          type: ElasticsearchAssetType.indexTemplate,
          customDataStreamOriginDataset: 'test-package.access',
          customDataStreamOriginType: 'logs',
        },
      ]);

      const logger = loggerMock.create();

      const result = await stepInstallIndexTemplatePipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger,
        packageInstallContext: makeIntegrationContext(dataStreams),
        installedPkg: mockInstalledPackageSo,
        installType: 'update',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [],
      });

      expect(result).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to reinstall custom dataset template')
      );
    });

    it('should not reinstall custom dataset templates when installedPkg is not present (fresh install)', async () => {
      const dataStreams = [{ dataset: 'test-package.access', type: 'logs', path: 'access' }];

      mockedInstallIndexTemplatesAndPipelines.mockResolvedValue({
        installedTemplates: [],
        esReferences: [],
      });

      await stepInstallIndexTemplatePipelines({
        savedObjectsClient: soClient,
        // @ts-ignore
        savedObjectsImporter: jest.fn(),
        esClient,
        logger: loggerMock.create(),
        packageInstallContext: makeIntegrationContext(dataStreams),
        installType: 'install',
        installSource: 'registry',
        spaceId: DEFAULT_SPACE_ID,
        esReferences: [],
      });

      expect(mockedInstallIndexTemplatesAndPipelines).toHaveBeenCalledTimes(1);
    });
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

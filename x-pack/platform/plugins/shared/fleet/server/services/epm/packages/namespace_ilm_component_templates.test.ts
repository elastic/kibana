/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import { appContextService } from '../../app_context';
import { updateCurrentWriteIndices } from '../elasticsearch/template/template';

import {
  DatasetOwnershipConflictError,
  assertComponentTemplatesMutable,
  resolveDatasetOwnership,
} from './dataset_ownership';
import { getInstallation } from './get';
import { updateEsAssetReferences } from './es_assets_reference';
import {
  syncClearIlmPolicy,
  syncSetIlmPolicyForNamespaces,
} from './namespace_ilm_component_templates';

jest.mock('./get');
jest.mock('../elasticsearch/template/template', () => ({
  generateNamespaceTemplateName: jest.fn(
    (templateName: string, namespace: string) => `${templateName}@namespace.${namespace}`
  ),
  generateNamespaceTemplateIndexPattern: jest.fn(
    (dataStream: { type: string; dataset: string }, namespace: string, _isOtel?: boolean) =>
      `${dataStream.type}-${dataStream.dataset}-${namespace}`
  ),
  getNamespaceTemplatePriority: jest.fn(() => 250),
  generateTemplateIndexPattern: jest.fn(
    (dataStream: { type: string; dataset: string }) => `${dataStream.type}-${dataStream.dataset}-*`
  ),
  getTemplatePriority: jest.fn(() => 200),
  updateCurrentWriteIndices: jest.fn(),
}));
jest.mock('./es_assets_reference');
jest.mock('../../app_context');
jest.mock('../elasticsearch/retry', () => ({
  retryTransientEsErrors: jest.fn((fn: () => unknown) => fn()),
}));
jest.mock('../elasticsearch/template/remove');
jest.mock('./dataset_ownership', () => {
  const actual = jest.requireActual('./dataset_ownership');
  return {
    ...actual,
    resolveDatasetOwnership: jest.fn(),
    assertComponentTemplatesMutable: jest.fn().mockResolvedValue(undefined),
  };
});

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

const mockedGetInstallation = getInstallation as jest.MockedFunction<typeof getInstallation>;
const mockedUpdateCurrentWriteIndices = updateCurrentWriteIndices as jest.MockedFunction<
  typeof updateCurrentWriteIndices
>;
const mockedUpdateEsAssetReferences = updateEsAssetReferences as jest.MockedFunction<
  typeof updateEsAssetReferences
>;
const mockedResolve = resolveDatasetOwnership as jest.MockedFunction<
  typeof resolveDatasetOwnership
>;
const mockedAssertComponents = assertComponentTemplatesMutable as jest.MockedFunction<
  typeof assertComponentTemplatesMutable
>;

const cleanResolution = {
  allowlist: [] as string[],
  adoptedStreams: [],
  conflicts: [],
  warnings: [],
};

const BASE_COMPOSED_OF = [
  'logs-nginx.access@package',
  'logs@custom',
  'nginx@custom',
  'production@custom',
  'logs-nginx.access@custom',
];

const dataStreams = [{ dataset: 'nginx.access', type: 'logs' }] as any[];
const packageInfo = { policy_templates: [], data_streams: dataStreams };

function makeEsClientWithNamespaceTemplate(composedOf: string[] = BASE_COMPOSED_OF) {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.indices.getIndexTemplate.mockResolvedValue({
    index_templates: [
      {
        name: 'logs-nginx.access@namespace.production',
        index_template: {
          composed_of: composedOf,
          index_patterns: ['logs-nginx.access-production'],
          priority: 250,
          template: { settings: {}, mappings: {} },
          data_stream: {},
          _meta: {},
        },
      },
    ],
  } as any);
  return esClient;
}

describe('syncSetIlmPolicyForNamespaces rollover', () => {
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppContextService.getLogger.mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any);
    mockedUpdateCurrentWriteIndices.mockResolvedValue(undefined);
    mockedUpdateEsAssetReferences.mockResolvedValue([]);
    mockedGetInstallation.mockResolvedValue({ installed_es: [] } as any);
    mockedResolve.mockResolvedValue({ ...cleanResolution, allowlist: ['logs-mine.data-prod'] });
    mockedAssertComponents.mockResolvedValue(undefined);
  });

  it('refuses to roll over when resolution reports a conflict', async () => {
    mockedResolve.mockResolvedValue({
      ...cleanResolution,
      conflicts: [{ kind: 'data_stream', name: 'logs-mine.data-prod', reason: 'would_govern' }],
    });
    const esClient = makeEsClientWithNamespaceTemplate();

    await expect(
      syncSetIlmPolicyForNamespaces({
        soClient,
        esClient,
        packageName: 'nginx',
        packageInfo,
        dataStreams,
        namespaceIlmPolicies: [{ namespace: 'production', ilmPolicy: 'my-policy' }],
      })
    ).rejects.toBeInstanceOf(DatasetOwnershipConflictError);
    expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(mockedUpdateCurrentWriteIndices).not.toHaveBeenCalled();
  });

  it('does not write component templates when they are not owned', async () => {
    mockedAssertComponents.mockRejectedValue(new DatasetOwnershipConflictError('not owned'));
    const esClient = makeEsClientWithNamespaceTemplate();

    await expect(
      syncSetIlmPolicyForNamespaces({
        soClient,
        esClient,
        packageName: 'nginx',
        packageInfo,
        dataStreams,
        namespaceIlmPolicies: [{ namespace: 'production', ilmPolicy: 'my-policy' }],
      })
    ).rejects.toBeInstanceOf(DatasetOwnershipConflictError);
    expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
  });

  it('passes the resolved allowlist through', async () => {
    const esClient = makeEsClientWithNamespaceTemplate();

    await syncSetIlmPolicyForNamespaces({
      soClient,
      esClient,
      packageName: 'nginx',
      packageInfo,
      dataStreams,
      namespaceIlmPolicies: [{ namespace: 'production', ilmPolicy: 'my-policy' }],
    });

    expect(mockedUpdateCurrentWriteIndices).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      ['logs-mine.data-prod']
    );
  });
});

describe('syncClearIlmPolicy', () => {
  const soClient = savedObjectsClientMock.create();
  const ilmComposedOf = [
    ...BASE_COMPOSED_OF.slice(0, -1),
    'logs-nginx.access@namespace.production',
    'logs-nginx.access@custom',
  ];
  const summary = {
    packageName: 'nginx',
    namespace: 'production',
    updatedTemplates: [] as string[],
    removedTemplates: [] as string[],
    skipped: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAppContextService.getLogger.mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any);
    mockedUpdateCurrentWriteIndices.mockResolvedValue(undefined);
    mockedUpdateEsAssetReferences.mockResolvedValue([]);
    mockedGetInstallation.mockResolvedValue({
      installed_es: [],
      namespace_customization_enabled_for: ['production'],
    } as any);
    mockedResolve.mockResolvedValue({ ...cleanResolution, allowlist: ['logs-mine.data-prod'] });
    mockedAssertComponents.mockResolvedValue(undefined);
  });

  it('refuses to roll over when resolution reports a conflict', async () => {
    mockedResolve.mockResolvedValue({
      ...cleanResolution,
      conflicts: [{ kind: 'data_stream', name: 'logs-mine.data-prod', reason: 'would_govern' }],
    });
    const esClient = makeEsClientWithNamespaceTemplate(ilmComposedOf);

    await expect(
      syncClearIlmPolicy({
        soClient,
        esClient,
        packageName: 'nginx',
        packageInfo,
        dataStreams,
        namespace: 'production',
        summary: { ...summary },
      })
    ).rejects.toBeInstanceOf(DatasetOwnershipConflictError);
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(mockedUpdateCurrentWriteIndices).not.toHaveBeenCalled();
  });

  it('passes the resolved allowlist through', async () => {
    const esClient = makeEsClientWithNamespaceTemplate(ilmComposedOf);

    await syncClearIlmPolicy({
      soClient,
      esClient,
      packageName: 'nginx',
      packageInfo,
      dataStreams,
      namespace: 'production',
      summary: { ...summary },
    });

    expect(mockedUpdateCurrentWriteIndices).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      ['logs-mine.data-prod']
    );
  });
});

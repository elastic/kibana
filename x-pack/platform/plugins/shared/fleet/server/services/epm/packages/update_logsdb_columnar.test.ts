/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { prepareDataStreamTemplates } from '../elasticsearch/template/install';
import * as templateModule from '../elasticsearch/template/template';

import { getInstallationObject, getInstalledPackageWithAssets } from './get';
import { handleNamespaceTemplateRestoreAfterPackageInstall } from './namespace_datastream_templates';
import { fetchIndexTemplate } from './namespace_template_utils';
import { setLogsdbColumnarChoice } from './update_logsdb_columnar';

jest.mock('../../audit_logging', () => ({
  auditLoggingService: { writeCustomSoAuditLog: jest.fn() },
}));
jest.mock('./get');
jest.mock('../elasticsearch/template/install', () => ({ prepareDataStreamTemplates: jest.fn() }));
jest.mock('./namespace_datastream_templates', () => ({
  handleNamespaceTemplateRestoreAfterPackageInstall: jest.fn(),
}));
jest.mock('./namespace_template_utils', () => ({ fetchIndexTemplate: jest.fn() }));

const savedObjectsClient = savedObjectsClientMock.create();
const esClient = elasticsearchServiceMock.createElasticsearchClient();
const logger = loggerMock.create();

const installation = (attributes: Record<string, unknown> = {}) =>
  ({
    id: 'pkg',
    type: PACKAGES_SAVED_OBJECT_TYPE,
    attributes: {
      name: 'pkg',
      version: '1.0.0',
      installed_es: [
        {
          id: 'logs-custom.ds',
          type: 'index_template',
          customDataStreamOriginDataset: 'pkg.ds',
          customDataStreamOriginType: 'logs',
        },
        {
          id: 'metrics-custom.ds',
          type: 'index_template',
          customDataStreamOriginDataset: 'pkg.metrics',
          customDataStreamOriginType: 'metrics',
        },
      ],
      ...attributes,
    },
  } as any);

const packageInfo = (errorReadiness?: string) => ({
  name: 'pkg',
  version: '1.0.0',
  elasticsearch: { logsdb_columnar: 'opt_in' },
  policy_templates: [],
  data_streams: [
    { type: 'logs', dataset: 'pkg.ds', path: 'ds' },
    {
      type: 'logs',
      dataset: 'pkg.error',
      path: 'error',
      elasticsearch: errorReadiness ? { logsdb_columnar: errorReadiness } : {},
    },
    { type: 'metrics', dataset: 'pkg.metrics', path: 'metrics' },
  ],
});

const withAssets = (info = packageInfo()) =>
  ({ installation: {}, packageInfo: info, paths: [], assetsMap: new Map() } as any);

const indexTemplate = (index: Record<string, unknown>) => ({
  index_patterns: ['logs-x-*'],
  composed_of: [],
  template: { settings: { index } },
});

// The package declares `event.original` with `doc_values: false`; the columnar render drops it.
const packageMappings = (columnar: boolean) => ({
  properties: {
    event: {
      properties: { original: { type: 'keyword', ...(columnar ? {} : { doc_values: false }) } },
    },
  },
});

const setChoice = (enabled: boolean) =>
  setLogsdbColumnarChoice({ savedObjectsClient, esClient, logger, pkgName: 'pkg', enabled });

/** Every template write, in order: `index <name> <mode>`, `component <name> <mappings>`. */
const writes = () =>
  [
    ...esClient.indices.putIndexTemplate.mock.calls.map(([params]: any, i: number) => ({
      order: esClient.indices.putIndexTemplate.mock.invocationCallOrder[i],
      write: `index ${params.name} ${params.template.settings.index.mode ?? 'logsdb'}`,
    })),
    ...esClient.cluster.putComponentTemplate.mock.calls.map(([params]: any, i: number) => ({
      order: esClient.cluster.putComponentTemplate.mock.invocationCallOrder[i],
      write: `component ${params.name} ${
        params.template.mappings.properties.event.properties.original.doc_values === false
          ? 'logsdb'
          : 'columnar'
      }`,
    })),
    ...jest
      .mocked(handleNamespaceTemplateRestoreAfterPackageInstall)
      .mock.invocationCallOrder.map((order) => ({ order, write: 'namespaces' })),
  ]
    .sort((a, b) => a.order - b.order)
    .map(({ write }) => write);

const mockInstalledMode = (columnar: boolean) => {
  jest
    .mocked(getInstallationObject)
    .mockResolvedValue(installation(columnar ? { logsdb_columnar_enabled: true } : {}));
  jest.mocked(fetchIndexTemplate).mockImplementation(
    async () =>
      indexTemplate({
        lifecycle: { name: 'logs' },
        ...(columnar ? { mode: 'logsdb_columnar' } : {}),
      }) as any
  );
  esClient.cluster.getComponentTemplate.mockImplementation(
    async ({ name }: any) =>
      ({
        component_templates: [
          {
            name,
            component_template: {
              template: { settings: { index: {} }, mappings: packageMappings(columnar) },
              _meta: { managed_by: 'fleet' },
            },
          },
        ],
      } as any)
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  esClient.indices.putIndexTemplate.mockReset();
  esClient.cluster.putComponentTemplate.mockReset();
  savedObjectsClient.update.mockReset();
  mockInstalledMode(false);
  jest.mocked(getInstalledPackageWithAssets).mockResolvedValue(withAssets());
  jest.mocked(prepareDataStreamTemplates).mockImplementation(
    async (dataStreams, _context, _assets, _features, modes) =>
      dataStreams.map(({ type, dataset }) => {
        const templateName = `${type}-${dataset}`;
        return {
          componentTemplates: {
            [`${templateName}@package`]: {
              _meta: {},
              template: { mappings: packageMappings(modes?.get(templateName) !== undefined) },
            },
          },
          indexTemplate: { templateName, indexTemplate: {} as any },
        };
      }) as any
  );
  jest.mocked(handleNamespaceTemplateRestoreAfterPackageInstall).mockResolvedValue(undefined);
  jest.spyOn(templateModule, 'updateCurrentWriteIndices').mockResolvedValue(undefined);
});

describe('setLogsdbColumnarChoice', () => {
  it('turns the mode on for the logs data streams and their custom datasets, then rolls over', async () => {
    await expect(setChoice(true)).resolves.toEqual({ changed: true });

    const [dataStreams, , , , modes] = jest.mocked(prepareDataStreamTemplates).mock.calls[0];
    expect(dataStreams.map(({ dataset, path }) => [dataset, path])).toEqual([
      ['pkg.ds', 'ds'],
      ['pkg.error', 'error'],
      ['custom.ds', 'ds'],
    ]);
    expect([...modes!.values()]).toEqual(Array(3).fill('logsdb_columnar'));
    // The columnar mappings go in first, so that Elasticsearch accepts the mode.
    expect(writes()).toEqual([
      'component logs-pkg.ds@package columnar',
      'component logs-pkg.error@package columnar',
      'component logs-custom.ds@package columnar',
      'index logs-pkg.ds logsdb_columnar',
      'index logs-pkg.error logsdb_columnar',
      'index logs-custom.ds logsdb_columnar',
      'namespaces',
    ]);
    expect(esClient.cluster.putComponentTemplate.mock.calls[0][0]).toEqual({
      name: 'logs-pkg.ds@package',
      template: { settings: { index: {} }, mappings: packageMappings(true) },
      _meta: { managed_by: 'fleet' },
    });
    expect(savedObjectsClient.update).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, 'pkg', {
      logsdb_columnar_enabled: true,
    });
    expect(templateModule.updateCurrentWriteIndices).toHaveBeenCalledWith(
      esClient,
      logger,
      expect.any(Array),
      { rolloverOnIndexModeReset: true }
    );
  });

  it('turns the mode off before putting back the mappings, and keeps the other index settings', async () => {
    mockInstalledMode(true);

    await setChoice(false);

    expect(writes()).toEqual([
      'index logs-pkg.ds logsdb',
      'index logs-pkg.error logsdb',
      'index logs-custom.ds logsdb',
      'namespaces',
      'component logs-pkg.ds@package logsdb',
      'component logs-pkg.error@package logsdb',
      'component logs-custom.ds@package logsdb',
    ]);
    expect(esClient.indices.putIndexTemplate.mock.calls[0][0]).toMatchObject({
      template: { settings: { index: { lifecycle: { name: 'logs' } } } },
    });
  });

  it('is a no-op when the stored choice already matches', async () => {
    mockInstalledMode(true);

    await expect(setChoice(true)).resolves.toEqual({ changed: false });
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
  });

  it('refuses to turn it on unless every logs data stream is ready', async () => {
    jest
      .mocked(getInstalledPackageWithAssets)
      .mockResolvedValue(withAssets(packageInfo('unsupported')));

    await expect(setChoice(true)).rejects.toThrow(
      'pkg can only use the logsdb_columnar index mode when all its logs data streams are ready for it; not ready: pkg.error'
    );
    expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('puts the templates back in LogsDB order and stores nothing when one is rejected', async () => {
    esClient.indices.putIndexTemplate
      .mockResolvedValueOnce({ acknowledged: true })
      .mockRejectedValueOnce(new Error('rejected'));

    await expect(setChoice(true)).rejects.toThrow('rejected');

    expect(writes().slice(5)).toEqual([
      'index logs-pkg.ds logsdb',
      'index logs-pkg.error logsdb',
      'index logs-custom.ds logsdb',
      'namespaces',
      'component logs-pkg.ds@package logsdb',
      'component logs-pkg.error@package logsdb',
      'component logs-custom.ds@package logsdb',
    ]);
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
    expect(templateModule.updateCurrentWriteIndices).not.toHaveBeenCalled();
  });

  it('puts the templates back in columnar order when the choice cannot be stored', async () => {
    mockInstalledMode(true);
    savedObjectsClient.update.mockRejectedValueOnce(new Error('write blocked'));

    await expect(setChoice(false)).rejects.toThrow('write blocked');

    expect(writes().slice(7)).toEqual([
      'component logs-pkg.ds@package columnar',
      'component logs-pkg.error@package columnar',
      'component logs-custom.ds@package columnar',
      'index logs-pkg.ds logsdb_columnar',
      'index logs-pkg.error logsdb_columnar',
      'index logs-custom.ds logsdb_columnar',
      'namespaces',
    ]);
  });

  it('throws when the package is not installed', async () => {
    jest.mocked(getInstallationObject).mockResolvedValue(undefined);

    await expect(setChoice(true)).rejects.toThrow('pkg is not installed');
  });
});

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
import * as templateModule from '../elasticsearch/template/template';

import { getInstallationObject, getPackageInfo } from './get';
import { handleNamespaceTemplateRestoreAfterPackageInstall } from './namespace_datastream_templates';
import { fetchIndexTemplate } from './namespace_template_utils';
import { setLogsdbColumnarChoice } from './update_logsdb_columnar';

jest.mock('../../audit_logging', () => ({
  auditLoggingService: { writeCustomSoAuditLog: jest.fn() },
}));
jest.mock('./get');
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

const indexTemplate = (index: Record<string, unknown>) => ({
  index_patterns: ['logs-x-*'],
  composed_of: [],
  template: { settings: { index } },
});

const setChoice = (enabled: boolean) =>
  setLogsdbColumnarChoice({ savedObjectsClient, esClient, logger, pkgName: 'pkg', enabled });

const writtenModes = () =>
  esClient.indices.putIndexTemplate.mock.calls.map(([params]: any) => [
    params.name,
    params.template.settings.index,
  ]);

beforeEach(() => {
  jest.clearAllMocks();
  esClient.indices.putIndexTemplate.mockReset();
  savedObjectsClient.update.mockReset();
  jest.mocked(getInstallationObject).mockResolvedValue(installation());
  jest.mocked(getPackageInfo).mockResolvedValue(packageInfo() as any);
  jest
    .mocked(fetchIndexTemplate)
    .mockImplementation(async () => indexTemplate({ lifecycle: { name: 'logs' } }) as any);
  jest.mocked(handleNamespaceTemplateRestoreAfterPackageInstall).mockResolvedValue(undefined);
  jest.spyOn(templateModule, 'updateCurrentWriteIndices').mockResolvedValue(undefined);
});

describe('setLogsdbColumnarChoice', () => {
  it('turns the mode on for the logs data streams and their custom datasets, then rolls over', async () => {
    await expect(setChoice(true)).resolves.toEqual({ changed: true });

    expect(writtenModes()).toEqual([
      ['logs-pkg.ds', { lifecycle: { name: 'logs' }, mode: 'logsdb_columnar' }],
      ['logs-pkg.error', { lifecycle: { name: 'logs' }, mode: 'logsdb_columnar' }],
      ['logs-custom.ds', { lifecycle: { name: 'logs' }, mode: 'logsdb_columnar' }],
    ]);
    expect(handleNamespaceTemplateRestoreAfterPackageInstall).toHaveBeenCalledTimes(1);
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

  it('turns the mode off and keeps the other index settings', async () => {
    jest
      .mocked(getInstallationObject)
      .mockResolvedValue(installation({ logsdb_columnar_enabled: true }));
    jest
      .mocked(fetchIndexTemplate)
      .mockImplementation(
        async () => indexTemplate({ lifecycle: { name: 'logs' }, mode: 'logsdb_columnar' }) as any
      );

    await setChoice(false);

    expect(writtenModes()[0]).toEqual(['logs-pkg.ds', { lifecycle: { name: 'logs' } }]);
  });

  it('is a no-op when the stored choice already matches', async () => {
    jest
      .mocked(getInstallationObject)
      .mockResolvedValue(installation({ logsdb_columnar_enabled: true }));

    await expect(setChoice(true)).resolves.toEqual({ changed: false });
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('refuses to turn it on unless every logs data stream is ready', async () => {
    jest.mocked(getPackageInfo).mockResolvedValue(packageInfo('unsupported') as any);

    await expect(setChoice(true)).rejects.toThrow(
      'pkg can only use the logsdb_columnar index mode when all its logs data streams are ready for it; not ready: pkg.error'
    );
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('puts the index templates back and stores nothing when one is rejected', async () => {
    esClient.indices.putIndexTemplate
      .mockResolvedValueOnce({ acknowledged: true })
      .mockRejectedValueOnce(new Error('rejected'));

    await expect(setChoice(true)).rejects.toThrow('rejected');

    expect(writtenModes().pop()).toEqual(['logs-pkg.ds', { lifecycle: { name: 'logs' } }]);
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
    expect(templateModule.updateCurrentWriteIndices).not.toHaveBeenCalled();
  });

  it('puts the index templates back when the choice cannot be stored', async () => {
    savedObjectsClient.update.mockRejectedValueOnce(new Error('write blocked'));

    await expect(setChoice(true)).rejects.toThrow('write blocked');

    expect(writtenModes().slice(-3)).toEqual([
      ['logs-pkg.ds', { lifecycle: { name: 'logs' } }],
      ['logs-pkg.error', { lifecycle: { name: 'logs' } }],
      ['logs-custom.ds', { lifecycle: { name: 'logs' } }],
    ]);
    // Once to follow the change, once to follow the restored templates.
    expect(handleNamespaceTemplateRestoreAfterPackageInstall).toHaveBeenCalledTimes(2);
  });

  it('refuses with 409 and changes nothing when an index template is missing', async () => {
    jest
      .mocked(fetchIndexTemplate)
      .mockImplementation(async (_esClient, name) =>
        name === 'logs-pkg.error' ? undefined : (indexTemplate({}) as any)
      );

    const error = await setChoice(true).catch((err) => err);
    expect(error.message).toBe(
      'Could not change the logsdb_columnar index mode of pkg: missing index templates logs-pkg.error. Reinstall the package to restore them, then try again.'
    );
    expect(error.statusCode).toBe(409);
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
  });

  it('throws when the package is not installed', async () => {
    jest.mocked(getInstallationObject).mockResolvedValue(undefined);

    await expect(setChoice(true)).rejects.toThrow('pkg is not installed');
  });
});

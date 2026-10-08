/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { FleetErrorWithStatusCode } from '../../../errors';
import { appContextService } from '../../app_context';
import * as templateModule from '../elasticsearch/template/template';

import { getInstalledPackageWithAssets } from './get';
import {
  applyLogsdbColumnarIndexMode,
  getColumnarReadyDataStreams,
  getColumnarUnsupportedDataStreams,
} from './update_logsdb_columnar';

// `prepareDataStreamTemplates` and the whole template-generation stack are deliberately left
// unmocked so the assertions cover the real mapping generator and the columnar stripping pass
// rather than a hand-written fixture. Only the side effects that would reach Elasticsearch or
// saved objects outside of the mocked client are stubbed.
jest.mock('../../app_context');
jest.mock('./get');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

const PKG_NAME = 'test';
const PKG_VERSION = '0.0.1';
const DATA_STREAM = 'logs-test.test';
const COMPONENT_TEMPLATE = `${DATA_STREAM}@package`;
const FIELDS_PATH = `${PKG_NAME}-${PKG_VERSION}/data_stream/test/fields/fields.yml`;

/**
 * `event.original` is the field the live-Elasticsearch verification tripped over: a keyword with
 * `doc_values: false` makes the columnar index template PUT fail with a 400.
 */
const FIELDS_YAML = `
- name: '@timestamp'
  type: date
- name: event.original
  type: keyword
  doc_values: false
  store: true
`;

const packageInfo = (dataStreamReadiness?: string, packageReadiness = 'opt_in') => ({
  name: PKG_NAME,
  version: PKG_VERSION,
  type: 'integration',
  elasticsearch: { logsdb_columnar: packageReadiness },
  data_streams: [
    {
      dataset: 'test.test',
      type: 'logs',
      path: 'test',
      package: PKG_NAME,
      ...(dataStreamReadiness
        ? { elasticsearch: { logsdb_columnar: dataStreamReadiness } }
        : { elasticsearch: {} }),
    },
  ],
});

const nestedCausedByError = () => {
  const esError: any = new Error('illegal_argument_exception');
  esError.statusCode = 400;
  esError.body = {
    error: {
      type: 'illegal_argument_exception',
      reason: `composable template [${DATA_STREAM}] template after composition with component templates [${COMPONENT_TEMPLATE}] is invalid`,
      caused_by: {
        type: 'illegal_argument_exception',
        reason: `invalid composite mappings for [${DATA_STREAM}]`,
        caused_by: {
          type: 'illegal_argument_exception',
          reason:
            'field [event.original] cannot reconstruct _source from doc values; every field must be reconstructable from doc values in index using [logsdb_columnar] index mode',
        },
      },
    },
    status: 400,
  };
  return esError;
};

describe('applyLogsdbColumnarIndexMode', () => {
  const savedObjectsClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  const logger = loggerMock.create();

  const mockInstalledPackage = (info: ReturnType<typeof packageInfo>) => {
    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      packageInfo: info,
      paths: [FIELDS_PATH],
      assetsMap: new Map([[FIELDS_PATH, Buffer.from(FIELDS_YAML, 'utf8')]]),
      installation: { name: PKG_NAME, version: PKG_VERSION },
    } as any);
  };

  const packageComponentTemplateMappings = () => {
    const call = esClient.cluster.putComponentTemplate.mock.calls.find(
      ([params]: any) => params.name === COMPONENT_TEMPLATE
    );
    return (call?.[0] as any).body.template.mappings;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockedAppContextService.getLogger.mockReturnValue(logger);
    mockedAppContextService.getExperimentalFeatures.mockReturnValue({} as any);
    // Keeps ILM resolution (and its saved-objects lookup) out of the template generation path.
    mockedAppContextService.getConfig.mockReturnValue({
      internal: { disableILMPolicies: true },
    } as any);

    jest.spyOn(templateModule, 'updateCurrentWriteIndices').mockResolvedValue(undefined);

    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          name: DATA_STREAM,
          index_template: {
            template: { settings: { index: {} }, mappings: {} },
            composed_of: [],
            index_patterns: '',
          },
        },
      ],
    } as any);
  });

  it('writes the columnar mode and strips doc_values/store when enabling', async () => {
    mockInstalledPackage(packageInfo());

    const { updatedDataStreams } = await applyLogsdbColumnarIndexMode({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled: true,
    });

    expect(updatedDataStreams).toEqual([DATA_STREAM]);
    expect(packageComponentTemplateMappings().properties.event.properties.original).toEqual({
      type: 'keyword',
    });
    expect(
      (esClient.indices.putIndexTemplate.mock.calls[0][0] as any).template.settings.index
    ).toEqual({ mode: 'logsdb_columnar' });
  });

  it('restores the package mappings and removes the mode when disabling', async () => {
    mockInstalledPackage(packageInfo());

    await applyLogsdbColumnarIndexMode({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled: false,
    });

    expect(packageComponentTemplateMappings().properties.event.properties.original).toEqual({
      type: 'keyword',
      doc_values: false,
      store: true,
    });
    expect(
      (esClient.indices.putIndexTemplate.mock.calls[0][0] as any).template.settings.index
    ).toEqual({});
  });

  it('asks for a rollover in both directions', async () => {
    mockInstalledPackage(packageInfo());

    await applyLogsdbColumnarIndexMode({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled: false,
    });

    expect(templateModule.updateCurrentWriteIndices).toHaveBeenCalledWith(
      esClient,
      logger,
      expect.any(Array),
      { rolloverOnIndexModeReset: true }
    );
  });

  it('writes the index template before the component templates when removing the mode', async () => {
    mockInstalledPackage(packageInfo());
    // The installed index template is currently columnar, so the mode is being removed.
    esClient.indices.getIndexTemplate.mockResolvedValue({
      index_templates: [
        {
          name: DATA_STREAM,
          index_template: {
            template: { settings: { index: { mode: 'logsdb_columnar' } }, mappings: {} },
            composed_of: [],
            index_patterns: '',
          },
        },
      ],
    } as any);

    const order: string[] = [];
    esClient.indices.putIndexTemplate.mockImplementation(async () => {
      order.push('indexTemplate');
      return {} as any;
    });
    esClient.cluster.putComponentTemplate.mockImplementation(async () => {
      order.push('componentTemplate');
      return {} as any;
    });

    await applyLogsdbColumnarIndexMode({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled: false,
    });

    expect(order[0]).toEqual('indexTemplate');
    expect(order).toContain('componentTemplate');
  });

  it('writes the component templates before the index template when adding the mode', async () => {
    mockInstalledPackage(packageInfo());

    const order: string[] = [];
    esClient.indices.putIndexTemplate.mockImplementation(async () => {
      order.push('indexTemplate');
      return {} as any;
    });
    esClient.cluster.putComponentTemplate.mockImplementation(async () => {
      order.push('componentTemplate');
      return {} as any;
    });

    await applyLogsdbColumnarIndexMode({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled: true,
    });

    expect(order[0]).toEqual('componentTemplate');
    expect(order[order.length - 1]).toEqual('indexTemplate');
  });

  it('enriches a nested Elasticsearch rejection and rolls the component template back', async () => {
    mockInstalledPackage(packageInfo());
    esClient.indices.putIndexTemplate.mockRejectedValueOnce(nestedCausedByError());

    await expect(
      applyLogsdbColumnarIndexMode({
        esClient,
        savedObjectsClient,
        logger,
        pkgName: PKG_NAME,
        enabled: true,
      })
    ).rejects.toThrow(FleetErrorWithStatusCode);

    const rollback = esClient.cluster.putComponentTemplate.mock.calls
      .filter(([params]: any) => params.name === COMPONENT_TEMPLATE)
      .pop();
    expect(
      (rollback?.[0] as any).body.template.mappings.properties.event.properties.original
    ).toEqual({ type: 'keyword', doc_values: false, store: true });
  });

  it('does not enrich Elasticsearch errors when the mode is being removed', async () => {
    mockInstalledPackage(packageInfo());
    const err = nestedCausedByError();
    esClient.indices.putIndexTemplate.mockRejectedValueOnce(err);

    await expect(
      applyLogsdbColumnarIndexMode({
        esClient,
        savedObjectsClient,
        logger,
        pkgName: PKG_NAME,
        enabled: false,
      })
    ).rejects.toBe(err);
  });

  it('rejects enabling when no logs data stream is columnar ready', async () => {
    mockInstalledPackage(packageInfo('unsupported'));

    await expect(
      applyLogsdbColumnarIndexMode({
        esClient,
        savedObjectsClient,
        logger,
        pkgName: PKG_NAME,
        enabled: true,
      })
    ).rejects.toThrow(/has no logs data stream that declares readiness/);
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('is a no-op when disabling a package without any ready data stream', async () => {
    mockInstalledPackage(packageInfo('unsupported'));

    const { updatedDataStreams } = await applyLogsdbColumnarIndexMode({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled: false,
    });

    expect(updatedDataStreams).toEqual([]);
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });
});

describe('getColumnarReadyDataStreams / getColumnarUnsupportedDataStreams', () => {
  const info = {
    elasticsearch: { logsdb_columnar: 'default' as const },
  };
  const dataStreams = [
    { type: 'logs', dataset: 'a', elasticsearch: {} },
    { type: 'logs', dataset: 'b', elasticsearch: { logsdb_columnar: 'unsupported' } },
    { type: 'metrics', dataset: 'c', elasticsearch: {} },
    { type: 'logs', dataset: 'd', elasticsearch: { index_mode: 'time_series' } },
  ] as any[];

  it('keeps only ready logs data streams', () => {
    expect(getColumnarReadyDataStreams(info, dataStreams).map((ds) => ds.dataset)).toEqual(['a']);
  });

  it('lists the unsupported logs data streams', () => {
    expect(getColumnarUnsupportedDataStreams(info, dataStreams).map((ds) => ds.dataset)).toEqual([
      'b',
    ]);
  });
});

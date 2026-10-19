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

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';

import { getInstallationObject, getInstalledPackageWithAssets } from './get';
import {
  applyLogsdbColumnarIndexMode,
  getColumnarReadyDataStreams,
  getColumnarUnsupportedDataStreams,
  setLogsdbColumnarChoice,
} from './update_logsdb_columnar';

// `prepareDataStreamTemplates` and the whole template-generation stack are deliberately left
// unmocked so the assertions cover the real mapping generator and the columnar stripping pass
// rather than a hand-written fixture. Only the side effects that would reach Elasticsearch or
// saved objects outside of the mocked client are stubbed.
jest.mock('../../app_context');
jest.mock('../../audit_logging', () => ({
  auditLoggingService: { writeCustomSoAuditLog: jest.fn() },
}));
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

const nestedCausedByError = (templateName = DATA_STREAM) => {
  const esError: any = new Error('illegal_argument_exception');
  esError.statusCode = 400;
  esError.body = {
    error: {
      type: 'illegal_argument_exception',
      reason: `composable template [${templateName}] template after composition with component templates [${COMPONENT_TEMPLATE}] is invalid`,
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

const savedObjectsClient = savedObjectsClientMock.create();
const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
const logger = loggerMock.create();

const mockInstalledPackage = (
  info: ReturnType<typeof packageInfo>,
  installation: Record<string, unknown> = {}
) => {
  jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
    packageInfo: info,
    paths: [FIELDS_PATH],
    assetsMap: new Map([[FIELDS_PATH, Buffer.from(FIELDS_YAML, 'utf8')]]),
    installation: { name: PKG_NAME, version: PKG_VERSION, ...installation },
  } as any);
};

const packageComponentTemplateMappings = () => {
  const call = esClient.cluster.putComponentTemplate.mock.calls.find(
    ([params]: any) => params.name === COMPONENT_TEMPLATE
  );
  return (call?.[0] as any).body.template.mappings;
};

const NAMESPACE_TEMPLATE = `${DATA_STREAM}@namespace.prod`;

/** Serves these index templates by name, wildcards included, as Elasticsearch would. */
const mockIndexTemplates = (
  templates: Record<string, { mode?: string; composed_of?: string[]; priority?: number }>
) => {
  esClient.indices.getIndexTemplate.mockImplementation(async (params: any) => {
    const name: string = params?.name ?? '';
    return {
      index_templates: Object.entries(templates)
        .filter(([templateName]) =>
          name.endsWith('*') ? templateName.startsWith(name.slice(0, -1)) : templateName === name
        )
        .map(([templateName, { mode, composed_of: composedOf = [], priority = 200 }]) => ({
          name: templateName,
          index_template: {
            index_patterns: [templateName],
            priority,
            composed_of: composedOf,
            template: { settings: { index: mode ? { mode } : {} }, mappings: {} },
            created_date_millis: 1,
          },
        })),
    } as any;
  });
};

/** Records the index and component template writes, in order. */
const trackWrites = () => {
  const writes: string[] = [];
  esClient.indices.putIndexTemplate.mockImplementation(async (params: any) => {
    writes.push(`index:${params.name}`);
    return { acknowledged: true } as any;
  });
  esClient.cluster.putComponentTemplate.mockImplementation(async (params: any) => {
    writes.push(`component:${params.name}`);
    return { acknowledged: true } as any;
  });
  return writes;
};

const lastIndexTemplateWrite = (name: string) =>
  esClient.indices.putIndexTemplate.mock.calls
    .filter(([params]: any) => params.name === name)
    .pop()?.[0] as any;

beforeEach(() => {
  jest.clearAllMocks();
  // `clearAllMocks` keeps implementations; drop the per-test rejection rules.
  esClient.indices.putIndexTemplate.mockReset();

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

describe('applyLogsdbColumnarIndexMode', () => {
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

  it('puts the data streams already switched back when another one is rejected', async () => {
    const info = packageInfo();
    mockInstalledPackage({
      ...info,
      data_streams: [
        ...info.data_streams,
        { ...info.data_streams[0], dataset: 'test.other', path: 'other' },
      ],
    });
    esClient.indices.putIndexTemplate.mockImplementation(async (params: any) => {
      if (params.name === 'logs-test.other' && params.template.settings.index.mode) {
        throw nestedCausedByError();
      }
      return { acknowledged: true };
    });

    await expect(
      applyLogsdbColumnarIndexMode({
        esClient,
        savedObjectsClient,
        logger,
        pkgName: PKG_NAME,
        enabled: true,
      })
    ).rejects.toThrow(FleetErrorWithStatusCode);

    const lastIndexTemplate = esClient.indices.putIndexTemplate.mock.calls
      .filter(([params]: any) => params.name === DATA_STREAM)
      .pop();
    expect((lastIndexTemplate?.[0] as any).template.settings.index).toEqual({});
    expect(templateModule.updateCurrentWriteIndices).not.toHaveBeenCalled();
  });

  it('rolls a data stream back to the mode it had, not to the opposite of the request', async () => {
    mockInstalledPackage(packageInfo());
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

    // The data stream was already on columnar: its component template goes back to the stripped
    // mappings, not to the LogsDB ones.
    const rollback = esClient.cluster.putComponentTemplate.mock.calls
      .filter(([params]: any) => params.name === COMPONENT_TEMPLATE)
      .pop();
    expect(
      (rollback?.[0] as any).body.template.mappings.properties.event.properties.original
    ).toEqual({ type: 'keyword' });
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

  it('applies the change to the custom-dataset copies of a ready data stream', async () => {
    mockInstalledPackage(packageInfo(), {
      installed_es: [
        { id: DATA_STREAM, type: 'index_template' },
        {
          id: 'logs-custom.dataset',
          type: 'index_template',
          customDataStreamOriginDataset: 'test.test',
          customDataStreamOriginType: 'logs',
        },
        {
          id: 'metrics-other.dataset',
          type: 'index_template',
          customDataStreamOriginDataset: 'test.metrics',
          customDataStreamOriginType: 'metrics',
        },
      ],
    });

    const { updatedDataStreams } = await applyLogsdbColumnarIndexMode({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled: true,
    });

    expect(updatedDataStreams.sort()).toEqual(['logs-custom.dataset', DATA_STREAM]);
    const customIndexTemplate = esClient.indices.putIndexTemplate.mock.calls.find(
      ([params]: any) => params.name === 'logs-custom.dataset'
    );
    expect((customIndexTemplate?.[0] as any).template.settings.index).toEqual({
      mode: 'logsdb_columnar',
    });
  });

  it('switches the namespace-scoped copies of the index template after it when adding the mode', async () => {
    mockInstalledPackage(packageInfo());
    mockIndexTemplates({
      [DATA_STREAM]: {},
      [NAMESPACE_TEMPLATE]: { composed_of: ['prod@custom'], priority: 250 },
    });
    const writes = trackWrites();

    await applyLogsdbColumnarIndexMode({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled: true,
    });

    expect(writes.slice(-2)).toEqual([`index:${DATA_STREAM}`, `index:${NAMESPACE_TEMPLATE}`]);
    const namespaceTemplate = lastIndexTemplateWrite(NAMESPACE_TEMPLATE);
    // Only the mode changes: the namespace template keeps its own pattern, priority and
    // `@custom` template.
    expect(namespaceTemplate).toEqual(
      expect.objectContaining({
        index_patterns: [NAMESPACE_TEMPLATE],
        priority: 250,
        composed_of: ['prod@custom'],
      })
    );
    expect(namespaceTemplate.template.settings.index).toEqual({ mode: 'logsdb_columnar' });
    expect(namespaceTemplate).not.toHaveProperty('created_date_millis');
  });

  it('removes the mode from the namespace-scoped copies before the component templates', async () => {
    mockInstalledPackage(packageInfo());
    mockIndexTemplates({
      [DATA_STREAM]: { mode: 'logsdb_columnar' },
      [NAMESPACE_TEMPLATE]: { mode: 'logsdb_columnar' },
    });
    const writes = trackWrites();

    await applyLogsdbColumnarIndexMode({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled: false,
    });

    expect(writes.indexOf(`index:${NAMESPACE_TEMPLATE}`)).toBeLessThan(
      writes.findIndex((write) => write.startsWith('component:'))
    );
    expect(lastIndexTemplateWrite(NAMESPACE_TEMPLATE).template.settings.index).toEqual({});
  });

  it('leaves a namespace-scoped copy alone when it already has the target mode', async () => {
    mockInstalledPackage(packageInfo());
    mockIndexTemplates({
      [DATA_STREAM]: {},
      [NAMESPACE_TEMPLATE]: { mode: 'logsdb_columnar' },
    });
    const writes = trackWrites();

    await applyLogsdbColumnarIndexMode({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled: true,
    });

    expect(writes).not.toContain(`index:${NAMESPACE_TEMPLATE}`);
  });

  it('names a rejected namespace-scoped template and puts the data stream back', async () => {
    mockInstalledPackage(packageInfo());
    mockIndexTemplates({ [DATA_STREAM]: {}, [NAMESPACE_TEMPLATE]: {} });
    esClient.indices.putIndexTemplate.mockImplementation(async (params: any) => {
      if (params.name === NAMESPACE_TEMPLATE && params.template.settings.index.mode) {
        throw nestedCausedByError(NAMESPACE_TEMPLATE);
      }
      return { acknowledged: true } as any;
    });

    await expect(
      applyLogsdbColumnarIndexMode({
        esClient,
        savedObjectsClient,
        logger,
        pkgName: PKG_NAME,
        enabled: true,
      })
    ).rejects.toThrow(
      `Elasticsearch rejected the logsdb_columnar index template for ${NAMESPACE_TEMPLATE}:`
    );

    expect(lastIndexTemplateWrite(DATA_STREAM).template.settings.index).toEqual({});
    expect(templateModule.updateCurrentWriteIndices).not.toHaveBeenCalled();
  });

  it('puts the index template of a rejected data stream back too', async () => {
    mockInstalledPackage(packageInfo());
    mockIndexTemplates({ [DATA_STREAM]: { mode: 'logsdb_columnar' } });
    trackWrites();
    // Removing the mode writes the index template first, so a component template rejected after
    // it leaves the data stream half switched unless the index template is put back as well.
    esClient.cluster.putComponentTemplate.mockRejectedValueOnce(new Error('rejected'));

    await expect(
      applyLogsdbColumnarIndexMode({
        esClient,
        savedObjectsClient,
        logger,
        pkgName: PKG_NAME,
        enabled: false,
      })
    ).rejects.toThrow('rejected');

    expect(lastIndexTemplateWrite(DATA_STREAM).template.settings.index).toEqual({
      mode: 'logsdb_columnar',
    });
    expect(templateModule.updateCurrentWriteIndices).not.toHaveBeenCalled();
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

describe('setLogsdbColumnarChoice', () => {
  const installation = (attributes: Record<string, unknown> = {}) =>
    ({
      id: PKG_NAME,
      type: PACKAGES_SAVED_OBJECT_TYPE,
      attributes: { name: PKG_NAME, version: PKG_VERSION, ...attributes },
    } as any);

  const setChoice = (enabled: boolean, extra: Record<string, unknown> = {}) =>
    setLogsdbColumnarChoice({
      esClient,
      savedObjectsClient,
      logger,
      pkgName: PKG_NAME,
      enabled,
      ...extra,
    });

  it('applies the choice to Elasticsearch, then stores it on the installation', async () => {
    jest.mocked(getInstallationObject).mockResolvedValue(installation());
    mockInstalledPackage(packageInfo());

    await expect(setChoice(true)).resolves.toEqual({ changed: true });

    expect(savedObjectsClient.update).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, PKG_NAME, {
      logsdb_columnar_enabled: true,
    });
    expect(
      (esClient.indices.putIndexTemplate.mock.calls[0][0] as any).template.settings.index
    ).toEqual({ mode: 'logsdb_columnar' });
    // Only an accepted change is stored, so a rejected one can be retried.
    expect(esClient.indices.putIndexTemplate.mock.invocationCallOrder[0]).toBeLessThan(
      savedObjectsClient.update.mock.invocationCallOrder[0]
    );
  });

  it('keeps the stored choice when Elasticsearch rejects the change, so it can be retried', async () => {
    jest.mocked(getInstallationObject).mockResolvedValue(installation());
    mockInstalledPackage(packageInfo());
    esClient.indices.putIndexTemplate.mockRejectedValueOnce(nestedCausedByError());

    await expect(setChoice(true)).rejects.toThrow(FleetErrorWithStatusCode);
    expect(savedObjectsClient.update).not.toHaveBeenCalled();

    await expect(setChoice(true)).resolves.toEqual({ changed: true });
    expect(savedObjectsClient.update).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, PKG_NAME, {
      logsdb_columnar_enabled: true,
    });
  });

  it('puts Elasticsearch back when the choice cannot be stored', async () => {
    jest.mocked(getInstallationObject).mockResolvedValue(installation());
    mockInstalledPackage(packageInfo());
    savedObjectsClient.update.mockRejectedValueOnce(new Error('write blocked'));

    await expect(setChoice(true)).rejects.toThrow('write blocked');

    const lastIndexTemplate = esClient.indices.putIndexTemplate.mock.calls.pop()?.[0] as any;
    expect(lastIndexTemplate.template.settings.index).toEqual({});
    // Once for the change, once to put the write indices back.
    expect(templateModule.updateCurrentWriteIndices).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when the stored choice already matches', async () => {
    jest
      .mocked(getInstallationObject)
      .mockResolvedValue(installation({ logsdb_columnar_enabled: true }));

    await expect(setChoice(true)).resolves.toEqual({ changed: false });

    expect(getInstalledPackageWithAssets).not.toHaveBeenCalled();
    expect(savedObjectsClient.update).not.toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('uses the installation handed over by the caller instead of fetching it', async () => {
    mockInstalledPackage(packageInfo());

    await expect(setChoice(false, { installation: installation() })).resolves.toEqual({
      changed: true,
    });

    expect(getInstallationObject).not.toHaveBeenCalled();
    expect(savedObjectsClient.update).toHaveBeenCalledWith(PACKAGES_SAVED_OBJECT_TYPE, PKG_NAME, {
      logsdb_columnar_enabled: false,
    });
  });

  it('rejects enabling a package without a ready logs data stream before anything is written', async () => {
    jest.mocked(getInstallationObject).mockResolvedValue(installation());
    mockInstalledPackage(packageInfo('unsupported'));

    await expect(setChoice(true)).rejects.toThrow(
      /has no logs data stream that declares readiness/
    );

    expect(savedObjectsClient.update).not.toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });

  it('throws when the package is not installed', async () => {
    jest.mocked(getInstallationObject).mockResolvedValue(undefined);

    await expect(setChoice(true)).rejects.toThrow(/is not installed/);

    expect(savedObjectsClient.update).not.toHaveBeenCalled();
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

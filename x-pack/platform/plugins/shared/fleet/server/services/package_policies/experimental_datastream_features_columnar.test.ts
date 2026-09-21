/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { FleetErrorWithStatusCode } from '../../errors';
import type { NewPackagePolicy } from '../../types';
import { appContextService } from '../app_context';
import * as templateModule from '../epm/elasticsearch/template/template';
import { getInstalledPackageWithAssets } from '../epm/packages/get';
import { updateDatastreamExperimentalFeatures } from '../epm/packages/update';

import { handleExperimentalDatastreamFeatureOptIn } from './experimental_datastream_features';

// Unlike experimental_datastream_features.test.ts, this suite deliberately leaves
// `prepareDataStreamTemplates` and the whole template-generation stack unmocked, so that the
// assertions below cover the real mapping generator (including the field-level `columnar`
// overrides) rather than a hand-written fixture. Only the two side effects that would hit
// Elasticsearch / saved objects outside of the mocked client are stubbed.
jest.mock('../app_context');
jest.mock('../epm/packages/get');
jest.mock('../epm/packages/update', () => ({
  updateDatastreamExperimentalFeatures: jest.fn(),
}));

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

const PKG_NAME = 'test';
const PKG_VERSION = '0.0.1';
const DATA_STREAM = 'metrics-test.test';
const COMPONENT_TEMPLATE = `${DATA_STREAM}@package`;
const FIELDS_PATH = `${PKG_NAME}-${PKG_VERSION}/data_stream/test/fields/fields.yml`;

/**
 * `event.original` is the field the live-Elasticsearch verification tripped over: a keyword with
 * `doc_values: false` makes the columnar index template PUT fail with a 400, and the package
 * fixes it with a `columnar.doc_values: true` override.
 */
const FIELDS_YAML = `
- name: '@timestamp'
  type: date
- name: event.original
  type: keyword
  doc_values: false
  index: false
  columnar:
    doc_values: true
    index: true
`;

/**
 * The mappings and `_meta` the @package component template was installed with. A rejected
 * columnar opt-in has to put exactly these back.
 */
const ORIGINAL_PROPERTIES = {
  '@timestamp': { type: 'date' },
  event: {
    properties: {
      original: { type: 'keyword', doc_values: false, index: false },
    },
  },
};

const ORIGINAL_META = { package: { name: 'test' }, managed_by: 'fleet', managed: true };

const PACKAGE_INFO = {
  name: PKG_NAME,
  version: PKG_VERSION,
  type: 'integration',
  data_streams: [
    {
      dataset: 'test.test',
      type: 'metrics',
      path: 'test',
      package: PKG_NAME,
      elasticsearch: { columnar: { supported: true } },
    },
  ],
};

/**
 * Elasticsearch reports a rejected columnar composition as a generic "template after composition
 * ... is invalid" at the top level and only names the offending field two `caused_by` levels down.
 */
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

describe('handleExperimentalDatastreamFeatureOptIn columnar field overrides', () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

  const getPolicy = (columnar: boolean): NewPackagePolicy =>
    ({
      name: 'Test policy',
      policy_id: 'agent-policy',
      policy_ids: ['agent-policy'],
      description: '',
      namespace: 'default',
      enabled: true,
      inputs: [],
      package: {
        name: PKG_NAME,
        title: 'Test',
        version: PKG_VERSION,
        experimental_data_stream_features: [{ data_stream: DATA_STREAM, features: { columnar } }],
      },
    } as NewPackagePolicy);

  const mockInstalledPackage = (storedColumnar: boolean) => {
    jest.mocked(getInstalledPackageWithAssets).mockResolvedValue({
      packageInfo: PACKAGE_INFO,
      paths: [FIELDS_PATH],
      assetsMap: new Map([[FIELDS_PATH, Buffer.from(FIELDS_YAML, 'utf8')]]),
      installation: {
        experimental_data_stream_features: [
          { data_stream: DATA_STREAM, features: { columnar: storedColumnar } },
        ],
      },
    } as any);
  };

  const putComponentTemplateMappings = () => {
    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(1);
    return (esClient.cluster.putComponentTemplate.mock.calls[0][0] as any).template.mappings;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockedAppContextService.getLogger.mockReturnValue({
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as any);
    mockedAppContextService.getExperimentalFeatures.mockReturnValue({} as any);
    // Keeps ILM resolution (and its saved-objects lookup) out of the template generation path.
    mockedAppContextService.getConfig.mockReturnValue({
      internal: { disableILMPolicies: true },
    } as any);

    jest.spyOn(templateModule, 'updateCurrentWriteIndices').mockResolvedValue(undefined);

    // The @package component template as installed with the package: the columnar overrides were
    // not applied, so `event.original` is still doc_values:false / index:false.
    esClient.cluster.getComponentTemplate.mockResolvedValue({
      component_templates: [
        {
          name: COMPONENT_TEMPLATE,
          component_template: {
            template: {
              settings: {},
              mappings: {
                properties: ORIGINAL_PROPERTIES,
              },
            },
            _meta: ORIGINAL_META,
            version: 3,
          },
        },
      ],
    } as any);

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

  it('rewrites the @package component template with the columnar overrides when opting in', async () => {
    mockInstalledPackage(false);

    await handleExperimentalDatastreamFeatureOptIn({
      soClient,
      esClient,
      packagePolicy: getPolicy(true),
    });

    expect(putComponentTemplateMappings().properties.event.properties.original).toEqual({
      type: 'keyword',
      doc_values: true,
      index: true,
    });
    // ...and the index template PUT switches the mode in the same pass.
    expect(
      (esClient.indices.putIndexTemplate.mock.calls[0][0] as any).template.settings.index
    ).toEqual({ mode: 'columnar' });
  });

  it('restores the package mappings on the @package component template when opting out', async () => {
    mockInstalledPackage(true);

    await handleExperimentalDatastreamFeatureOptIn({
      soClient,
      esClient,
      packagePolicy: getPolicy(false),
    });

    expect(putComponentTemplateMappings().properties.event.properties.original).toEqual({
      type: 'keyword',
      doc_values: false,
      index: false,
    });
  });

  it('explains how to fix a columnar mapping rejection from Elasticsearch', async () => {
    mockInstalledPackage(false);
    const esError: any = new Error('illegal_argument_exception');
    esError.statusCode = 400;
    esError.body = {
      error: {
        reason:
          'field [event.original] is not reconstructable from doc_values because doc_values are disabled',
      },
    };
    esClient.indices.putIndexTemplate.mockRejectedValueOnce(esError);

    await expect(
      handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy(true),
      })
    ).rejects.toThrow(
      /Elasticsearch rejected the columnar index template for metrics-test\.test: .*Fields with doc_values: false need a columnar\.doc_values: true override in the package\./
    );
  });

  it('enriches the error when the mapping cause is nested under caused_by', async () => {
    mockInstalledPackage(false);
    esClient.indices.putIndexTemplate.mockRejectedValueOnce(nestedCausedByError());

    const error = await handleExperimentalDatastreamFeatureOptIn({
      soClient,
      esClient,
      packagePolicy: getPolicy(true),
    }).catch((err) => err);

    // The deepest reason is the actionable one, the top-level one only says "composition failed".
    expect(error.message).toContain('field [event.original] cannot reconstruct _source');
    expect(error.message).toContain('columnar.doc_values: true');
    expect(error).toBeInstanceOf(FleetErrorWithStatusCode);
    expect(error.statusCode).toEqual(400);
  });

  it('restores the @package component template when the index template PUT is rejected', async () => {
    mockInstalledPackage(false);
    esClient.indices.putIndexTemplate.mockRejectedValueOnce(nestedCausedByError());

    await expect(
      handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy(true),
      })
    ).rejects.toThrow(FleetErrorWithStatusCode);

    expect(esClient.cluster.putComponentTemplate).toHaveBeenCalledTimes(2);

    // First the columnar overrides are written...
    const [optInCall, rollbackCall] = esClient.cluster.putComponentTemplate.mock.calls.map(
      (call) => call[0] as any
    );
    expect(optInCall.template.mappings.properties.event.properties.original).toEqual({
      type: 'keyword',
      doc_values: true,
      index: true,
    });
    // ...then the original template body and _meta are put back verbatim.
    expect(rollbackCall.name).toEqual(COMPONENT_TEMPLATE);
    expect(rollbackCall.template.mappings.properties).toEqual(ORIGINAL_PROPERTIES);
    expect(rollbackCall._meta).toEqual(ORIGINAL_META);

    expect(updateDatastreamExperimentalFeatures).not.toHaveBeenCalled();
  });

  it('rethrows unrelated index template errors unchanged', async () => {
    mockInstalledPackage(false);
    const esError: any = new Error('cluster_block_exception');
    esError.statusCode = 403;
    esClient.indices.putIndexTemplate.mockRejectedValueOnce(esError);

    await expect(
      handleExperimentalDatastreamFeatureOptIn({
        soClient,
        esClient,
        packagePolicy: getPolicy(true),
      })
    ).rejects.toBe(esError);
  });

  it('does not touch the component template when the columnar opt-in is unchanged', async () => {
    mockInstalledPackage(true);

    await handleExperimentalDatastreamFeatureOptIn({
      soClient,
      esClient,
      packagePolicy: getPolicy(true),
    });

    expect(esClient.cluster.putComponentTemplate).not.toHaveBeenCalled();
    expect(esClient.indices.putIndexTemplate).not.toHaveBeenCalled();
  });
});

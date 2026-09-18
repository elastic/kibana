/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Verifies that an unchanged alerts-as-data index template is not re-installed on every
 * install, so the cluster-state write it causes stops being part of every startup.
 *
 * The skip keys off a `_meta.content_hash` stamp the installer writes into the template,
 * which makes its correctness depend on how a real Elasticsearch round-trips that stamp
 * and the settings next to it: whether `_meta` survives `put_index_template`, and whether
 * a `total_fields.limit` raised outside this path (by a mapping field-limit crawl, or by
 * hand) leaves the stamp intact while changing the body. That last case is the whole
 * reason the limit is compared as a number rather than folded into the hash, and none of
 * it is observable against a mocked client. Only Elasticsearch is booted, no Kibana
 * server.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { getIndexTemplateAndPattern } from '../alerts_service/resource_installer_utils';
import { getDataStreamAdapter } from '../alerts_service/lib/data_stream_adapter';
import {
  createOrUpdateIndexTemplate,
  getIndexTemplate,
} from '../alerts_service/lib/create_or_update_index_template';
import { updateIndexTemplateFieldsLimit } from '../alerts_service/lib/update_index_template_fields_limit';
import { getTotalFieldsLimitFromSettings } from '../alerts_service/lib/total_fields_limit_settings';
import { RESOURCE_CONTENT_HASH_META_FIELD } from '../alerts_service/lib/resource_hash';

const TOTAL_FIELDS_LIMIT = 2500;
const KIBANA_VERSION = '9.0.0';
const COMPONENT_TEMPLATE = 'alerts-skiptmpl-mappings';
const ILM_POLICY = 'alerts-skiptmpl-ilm-policy';

describe('skipping unchanged alerts-as-data index templates', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;
  let logger: Logger;
  let putIndexTemplate: jest.SpyInstance;
  let simulateTemplate: jest.SpyInstance;
  let uniqueId = 0;

  jest.setTimeout(10 * 60 * 1000);

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });
    esServer = await startES();
    esClient = esServer.es.getClient();

    // The template composes this, and the installer throws if the simulated mapping is
    // empty, so it has to contribute real fields.
    await esClient.cluster.putComponentTemplate({
      name: COMPONENT_TEMPLATE,
      template: {
        mappings: {
          dynamic: false,
          properties: {
            '@timestamp': { type: 'date' },
            'kibana.alert.rule.uuid': { type: 'keyword' },
          },
        },
      },
    });
    await esClient.ilm.putLifecycle({
      name: ILM_POLICY,
      policy: { phases: { hot: { min_age: '0ms', actions: { rollover: { max_age: '30d' } } } } },
    });
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    putIndexTemplate = jest.spyOn(esClient.indices, 'putIndexTemplate');
    simulateTemplate = jest.spyOn(esClient.indices, 'simulateTemplate');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildTemplate = ({
    context,
    totalFieldsLimit = TOTAL_FIELDS_LIMIT,
    kibanaVersion = KIBANA_VERSION,
  }: {
    context: string;
    totalFieldsLimit?: number;
    kibanaVersion?: string;
  }): IndicesPutIndexTemplateRequest =>
    getIndexTemplate({
      componentTemplateRefs: [COMPONENT_TEMPLATE],
      ilmPolicyName: ILM_POLICY,
      indexPatterns: getIndexTemplateAndPattern({ context, namespace: 'default' }),
      kibanaVersion,
      namespace: 'default',
      totalFieldsLimit,
      dataStreamAdapter: getDataStreamAdapter({ useDataStreamForAlerts: false }),
    });

  const install = (template: IndicesPutIndexTemplateRequest) =>
    createOrUpdateIndexTemplate({ logger, esClient, template });

  const readInstalledTemplate = async (name: string) => {
    const { index_templates: indexTemplates } = await esClient.indices.getIndexTemplate({ name });
    return indexTemplates[0];
  };

  const readContentHash = async (name: string): Promise<string | undefined> => {
    const { index_template: indexTemplate } = await readInstalledTemplate(name);
    return indexTemplate._meta?.[RESOURCE_CONTENT_HASH_META_FIELD];
  };

  const readFieldsLimit = async (name: string): Promise<number | undefined> => {
    const { index_template: indexTemplate } = await readInstalledTemplate(name);
    return getTotalFieldsLimitFromSettings(indexTemplate.template?.settings);
  };

  const nextContext = () => `skiptmpl${++uniqueId}`;

  it('stamps a content hash on install and skips while the template is unchanged', async () => {
    const template = buildTemplate({ context: nextContext() });

    await install(template);

    expect(putIndexTemplate).toHaveBeenCalledTimes(1);
    const contentHash = await readContentHash(template.name);
    expect(contentHash).toEqual(expect.any(String));

    putIndexTemplate.mockClear();
    simulateTemplate.mockClear();
    await install(template);

    expect(putIndexTemplate).not.toHaveBeenCalled();
    // The simulate is a cluster-state read worth avoiding too, not just the write.
    expect(simulateTemplate).not.toHaveBeenCalled();
    expect(await readContentHash(template.name)).toEqual(contentHash);
  });

  it('PUTs again once the template content changes', async () => {
    const context = nextContext();
    const template = buildTemplate({ context });
    await install(template);
    const firstHash = await readContentHash(template.name);

    putIndexTemplate.mockClear();
    await install(buildTemplate({ context, kibanaVersion: '9.1.0' }));

    expect(putIndexTemplate).toHaveBeenCalledTimes(1);
    const secondHash = await readContentHash(template.name);
    expect(secondHash).toEqual(expect.any(String));
    expect(secondHash).not.toEqual(firstHash);
  });

  it('PUTs when the installed template carries no content hash', async () => {
    const template = buildTemplate({ context: nextContext() });
    // A template installed before the stamp existed.
    await esClient.indices.putIndexTemplate(template);
    expect(await readContentHash(template.name)).toBeUndefined();

    putIndexTemplate.mockClear();
    await install(template);

    expect(putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(await readContentHash(template.name)).toEqual(expect.any(String));
  });

  it('skips when the total_fields.limit was raised out of band', async () => {
    const template = buildTemplate({ context: nextContext() });
    await install(template);
    const contentHash = await readContentHash(template.name);

    // Exactly the raise a mapping field-limit crawl performs. It preserves `_meta`, so
    // the stamp still matches a body that no longer matches it — which is why hashing
    // the limit would turn every crawl into a redundant install on the next startup.
    await updateIndexTemplateFieldsLimit({
      esClient,
      template: await readInstalledTemplate(template.name),
      limit: 5000,
    });
    expect(await readFieldsLimit(template.name)).toEqual(5000);
    expect(await readContentHash(template.name)).toEqual(contentHash);

    putIndexTemplate.mockClear();
    simulateTemplate.mockClear();
    await install(template);

    expect(putIndexTemplate).not.toHaveBeenCalled();
    expect(simulateTemplate).not.toHaveBeenCalled();
    // The raised limit is left alone rather than lowered back to the configured one.
    expect(await readFieldsLimit(template.name)).toEqual(5000);
  });

  it('PUTs when the configured total_fields.limit is raised above the installed one', async () => {
    const context = nextContext();
    const template = buildTemplate({ context });
    await install(template);
    expect(await readFieldsLimit(template.name)).toEqual(TOTAL_FIELDS_LIMIT);

    putIndexTemplate.mockClear();
    // The content hash does not cover the limit, so only the numeric check can catch
    // this. It has to install, or a raised configured limit would never reach ES.
    await install(buildTemplate({ context, totalFieldsLimit: 4000 }));

    expect(putIndexTemplate).toHaveBeenCalledTimes(1);
    expect(await readFieldsLimit(template.name)).toEqual(4000);
  });
});

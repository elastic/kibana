/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Verifies the resource-install concurrency bound that caps Kibana peak heap.
 *
 * Each alerts-as-data resource install holds a large (multi-MB) resolved
 * mapping in memory while it runs against Elasticsearch, so an unbounded
 * per-(context x namespace) fan-out can retain enough of them at once to OOM
 * the Kibana node (see https://github.com/elastic/kibana/issues/277498).
 *
 * This test drives a storm shaped like the real failure — many `.alerts-*`
 * indices whose `index.mapping.total_fields.limit` sits below the resolved
 * mapping's field count (as after an ECS field bump), so every install crawls
 * the limit up against a real Elasticsearch — through the real
 * `createResourceInstallationHelper`, triggered both via `add` (startup) and
 * `retry` (rule-execution-driven), and asserts the number of in-flight
 * installs never exceeds the bound. Bounded in-flight installs mean bounded
 * live mappings, which is what keeps peak heap flat regardless of how many
 * spaces/contexts need installing.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { updateIndexMappingsAndSettings } from '../alerts_service/lib/create_concrete_write_index';
import {
  createResourceInstallationHelper,
  successResult,
  MAX_CONCURRENT_RESOURCE_INSTALLATIONS,
} from '../alerts_service/create_resource_installation_helper';
import type { IRuleTypeAlerts } from '../types';
import { setupTestServers } from './lib';

const NUM_CONTEXTS = 6;
const NUM_SPACES = 10; // => 60 (context x space) indices

// The indices start at this limit; the resolved mapping carries more fields
// (as after an ECS bump), so each first install crawls the limit up in small
// increments — holding its multi-MB mapping the whole time.
const STARTING_FIELD_LIMIT = 2500;
// ~2,600 keyword fields ≈ a ~2.6 MB resolved mapping, matching the incident.
const FIELDS_PER_MAPPING = 2600;

// Additional install passes over the same indices (distinct helper keys) that
// re-trigger installs the way repeated rule runs do.
const EXTRA_PASSES = 2;

interface IndexRef {
  index: string;
  alias: string;
  isWriteIndex: boolean;
  isHidden: boolean;
}

function buildMapping(count: number): MappingTypeMapping {
  const properties: Record<string, { type: 'keyword' }> = {};
  for (let i = 0; i < count; i++) {
    properties[`storm_field_${i}`] = { type: 'keyword' };
  }
  return { dynamic: false, properties };
}

// Silent logger: the field-limit crawl logs each attempt for every install and
// would otherwise drown the test output.
function makeSilentLogger(): Logger {
  return loggingSystemMock.createLogger();
}

describe('alerting resource-install concurrency bound', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let esClient: ElasticsearchClient;

  jest.setTimeout(15 * 60 * 1000);

  beforeAll(async () => {
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;
    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  it('keeps in-flight installs (and their in-memory mappings) bounded during a multi-space x multi-context storm', async () => {
    // Build the pool of under-limit indices, each with its own index template
    // (the field-limit crawl updates the template alongside the index).
    const refs: IndexRef[] = [];
    for (let c = 0; c < NUM_CONTEXTS; c++) {
      for (let s = 0; s < NUM_SPACES; s++) {
        const alias = `.alerts-stormctx${c}.alerts-space-${s}`;
        const index = `.internal.${alias.slice(1)}-000001`;
        refs.push({ index, alias, isWriteIndex: true, isHidden: true });
      }
    }

    const SETUP_BATCH = 20;
    for (let i = 0; i < refs.length; i += SETUP_BATCH) {
      const batch = refs.slice(i, i + SETUP_BATCH);
      await Promise.all(
        batch.map(async (r) => {
          await esClient.indices.putIndexTemplate({
            name: `${r.alias}-index-template`,
            index_patterns: [`.internal.${r.alias.slice(1)}-*`],
            template: {
              settings: { 'index.mapping.total_fields.limit': STARTING_FIELD_LIMIT },
              mappings: { dynamic: false },
            },
          });
          await esClient.indices.create({
            index: r.index,
            aliases: { [r.alias]: { is_write_index: true, is_hidden: true } },
            settings: {
              'index.number_of_replicas': 0,
              'index.number_of_shards': 1,
              'index.mapping.total_fields.limit': STARTING_FIELD_LIMIT,
            },
            mappings: { dynamic: false },
          });
        })
      );
    }

    const indexByKey = new Map<string, IndexRef>();
    const firstErrors: string[] = [];
    let inFlight = 0;
    let maxConcurrent = 0;
    let peakHeapUsed = 0;

    // One install: build its own resolved mapping (held for the whole run, as
    // in production) and drive the real update path against real ES.
    const installFn = async (context: IRuleTypeAlerts, namespace: string) => {
      const ref = indexByKey.get(`${context.context}_${namespace}`);
      if (!ref) {
        throw new Error(`No index for ${context.context}_${namespace}`);
      }
      inFlight++;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      peakHeapUsed = Math.max(peakHeapUsed, process.memoryUsage().heapUsed);
      try {
        await updateIndexMappingsAndSettings({
          logger: makeSilentLogger(),
          esClient,
          totalFieldsLimit: STARTING_FIELD_LIMIT,
          concreteIndices: [ref],
          simulatedMapping: buildMapping(FIELDS_PER_MAPPING),
        });
      } catch (e) {
        if (firstErrors.length < 3) {
          firstErrors.push(String(e?.message ?? e));
        }
        throw e;
      } finally {
        inFlight--;
      }
    };

    const helper = createResourceInstallationHelper(
      makeSilentLogger(),
      Promise.resolve(successResult()),
      installFn
    );

    const registerKey = (context: string, namespace: string, ref: IndexRef) => {
      indexByKey.set(`${context}_${namespace}`, ref);
      return { context, namespace };
    };

    // Startup-shaped wave: every (context x space) added at once. Each of
    // these installs crawls the field limit up, holding its mapping throughout.
    const addWave = refs.map((r) => registerKey(r.alias, 'default', r));
    for (const { context, namespace } of addWave) {
      helper.add({ context, mappings: { fieldMap: {} } }, namespace);
    }
    const addResults = await Promise.all(
      addWave.map(({ context, namespace }) => helper.getInitializedContext(context, namespace))
    );

    // Rule-execution-shaped wave: re-trigger every key through `retry` — the
    // same bound must gate this path too.
    for (const { context, namespace } of addWave) {
      helper.retry({ context, mappings: { fieldMap: {} } }, namespace);
    }
    const retryResults = await Promise.all(
      addWave.map(({ context, namespace }) => helper.getInitializedContext(context, namespace))
    );

    // Layered passes with distinct keys over the same indices, enqueued all at
    // once, to keep the fan-out saturated well past the bound.
    const passWave: Array<{ context: string; namespace: string }> = [];
    for (let p = 0; p < EXTRA_PASSES; p++) {
      for (const r of refs) {
        passWave.push(registerKey(r.alias, `pass-${p}`, r));
      }
    }
    for (const { context, namespace } of passWave) {
      helper.add({ context, mappings: { fieldMap: {} } }, namespace);
    }
    const passResults = await Promise.all(
      passWave.map(({ context, namespace }) => helper.getInitializedContext(context, namespace))
    );

    const allResults = [...addResults, ...retryResults, ...passResults];
    const succeeded = allResults.filter(({ result }) => result).length;

    // eslint-disable-next-line no-console
    console.log(
      `[resource-install concurrency] ${succeeded}/${allResults.length} installs succeeded, ` +
        `maxConcurrentInstalls=${maxConcurrent}, peakHeapUsed=${(
          peakHeapUsed /
          1024 /
          1024
        ).toFixed(0)} MB` +
        (firstErrors.length ? `, firstErrors=${JSON.stringify(firstErrors)}` : '')
    );

    expect(succeeded).toEqual(allResults.length);
    expect(maxConcurrent).toBeGreaterThan(0);
    expect(maxConcurrent).toBeLessThanOrEqual(MAX_CONCURRENT_RESOURCE_INSTALLATIONS);
  });
});

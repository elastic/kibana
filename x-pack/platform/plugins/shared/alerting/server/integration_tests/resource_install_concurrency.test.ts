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
 * This test drives a storm shaped like the real failure — `.alerts-*` indices
 * whose `index.mapping.total_fields.limit` sits below the resolved mapping's
 * field count (as after an ECS field bump), so every install crawls the limit
 * up against a real Elasticsearch — through the real
 * `createResourceInstallationHelper`, triggered both via `add` (startup) and
 * `retry` (rule-execution-driven), and asserts the number of in-flight
 * installs never exceeds the bound. Bounded in-flight installs mean bounded
 * live mappings, which is what keeps peak heap flat regardless of how many
 * spaces/contexts need installing. The storm is deliberately kept small (the
 * bound saturates just as well at small scale) so the suite stays cheap in CI;
 * only Elasticsearch is booted — no Kibana server — so the logged peak heap
 * reflects the install path rather than an in-process Kibana.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { Logger } from '@kbn/core/server';
import { updateIndexMappingsAndSettings } from '../alerts_service/lib/create_concrete_write_index';
import {
  createResourceInstallationHelper,
  successResult,
  MAX_CONCURRENT_RESOURCE_INSTALLATIONS,
} from '../alerts_service/create_resource_installation_helper';
import type { IRuleTypeAlerts } from '../types';

const NUM_CONTEXTS = 3;
const NUM_SPACES = 4; // => 12 (context x space) indices

// The indices start at this limit; the resolved mapping carries more fields
// (as after an ECS bump), so each first install crawls the limit up in small
// increments — holding its mapping the whole time.
const STARTING_FIELD_LIMIT = 370;
const FIELDS_PER_MAPPING = 400;

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
  let esClient: ElasticsearchClient;

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
  });

  afterAll(async () => {
    await esServer?.stop();
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

    await Promise.all(
      refs.map(async (r) => {
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

    // Startup-shaped wave: every (context x space) added at once. Each of
    // these installs crawls the field limit up, holding its mapping throughout.
    const keys = refs.map((r) => {
      indexByKey.set(`${r.alias}_default`, r);
      return { context: r.alias, namespace: 'default' };
    });
    for (const { context, namespace } of keys) {
      helper.add({ context, mappings: { fieldMap: {} } }, namespace);
    }
    const addResults = await Promise.all(
      keys.map(({ context, namespace }) => helper.getInitializedContext(context, namespace))
    );

    // Rule-execution-shaped wave: re-trigger every key through `retry` — the
    // same bound must gate this path too.
    for (const { context, namespace } of keys) {
      helper.retry({ context, mappings: { fieldMap: {} } }, namespace);
    }
    const retryResults = await Promise.all(
      keys.map(({ context, namespace }) => helper.getInitializedContext(context, namespace))
    );

    const allResults = [...addResults, ...retryResults];
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

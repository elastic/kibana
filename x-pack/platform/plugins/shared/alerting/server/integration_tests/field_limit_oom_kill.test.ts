/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Verifies the resource-install concurrency bound keeps Kibana within heap.
 *
 * Drives a large-deployment-shaped workload (many over-limit `.alerts-*` indices,
 * layered concurrent install passes) through the real `createResourceInstallationHelper`
 * against a real Elasticsearch at the default Node heap, and asserts in-flight
 * install concurrency stays bounded so heap stays flat and the run completes
 * without OOM.
 *
 * To observe the pre-fix OOM, relax `MAX_CONCURRENT_RESOURCE_INSTALLATIONS` in
 * `../alerts_service/create_resource_installation_helper.ts` and re-run: heap
 * climbs to the ~4 GB wall and dies with "JavaScript heap out of memory".
 */

import { execSync } from 'child_process';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { updateIndexMappingsAndSettings } from '../alerts_service/lib/create_concrete_write_index';
import {
  createResourceInstallationHelper,
  successResult,
} from '../alerts_service/create_resource_installation_helper';
import type { IRuleTypeAlerts } from '../types';
import { setupTestServers } from './lib';

// If a prior run OOM-killed the worker, `afterAll` never ran and the test ES is
// left orphaned, colliding with the next run's startup. Clean up any leftover
// `.es/es-test-cluster` process first (won't touch other Elasticsearch instances).
function killStaleTestEs() {
  try {
    execSync("pkill -f '.es/es-test-cluster' || true", { stdio: 'ignore' });
  } catch {
    // best-effort; ignore
  }
}

// Pre-#274024 hard-coded ceiling. The storm starts by resetting indices to this.
const PRE_FIX_LIMIT = 2500;

// Looser than the production cap so a minor bump won't break the test, but well
// below the enqueued count so an unbounded regression still fails it loudly.
const MAX_OBSERVED_CONCURRENCY_CEILING = 25;

// Heap is filled by mappings IN FLIGHT at once (indices x passes), not the raw
// index count, so we keep the index pool modest and drive heap via concurrency.
const NUM_CONTEXTS = 6;
const NUM_SPACES = 20; // => 120 indices

// ~2,600 keyword fields ≈ a ~2.6 MB resolved mapping.
const FIELDS_PER_MAPPING = 2600;
// The pre-existing (upgraded-in-place) indices already sit just over the ceiling.
const STARTING_LIMIT = FIELDS_PER_MAPPING + 10;

// Layered install passes over the index pool: 120 indices x 40 passes = ~4,800
// mappings that would be in flight unbounded. Bump this if it doesn't OOM unbounded
// on your machine.
const CONCURRENT_PASSES = 40;

interface IndexRef {
  index: string;
  alias: string;
  isWriteIndex: boolean;
  isHidden: boolean;
}

function buildMapping(count: number): MappingTypeMapping {
  const properties: Record<string, { type: 'keyword' }> = {};
  for (let i = 0; i < count; i++) {
    properties[`oom_repro_field_${i}`] = { type: 'keyword' };
  }
  return { dynamic: false, properties };
}

// Retains logged strings (as DEBUG logging of each mapping body would) to add heap
// pressure, without echoing to the console.
function makeRetainingDebugLogger(sink: string[]): Logger {
  const base = loggingSystemMock.createLogger();
  const keep = (msg: unknown) => {
    if (typeof msg === 'string') sink.push(msg);
  };
  (base.info as jest.Mock).mockImplementation(keep);
  (base.debug as jest.Mock).mockImplementation(keep);
  (base.warn as jest.Mock).mockImplementation(keep);
  (base.error as jest.Mock).mockImplementation(keep);
  return base;
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

describe('alerting AAD resource-install heap-OOM fix verification', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let esClient: ElasticsearchClient;

  jest.setTimeout(30 * 60 * 1000); // generous: ES setup + heap climb

  beforeAll(async () => {
    // A prior OOM-killed run may have orphaned the test ES; clear it first.
    killStaleTestEs();

    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;
    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    // The single-node test ES defaults to a 1,000-shard cap; we create hundreds
    // of indices. Lift the cap so index SETUP doesn't fail before the heap climb
    // (this is a test-cluster sizing concern, unrelated to the OOM mechanism).
    await esClient.cluster.putSettings({
      persistent: { 'cluster.max_shards_per_node': 100000 },
    });
  });

  afterAll(async () => {
    if (kibanaServer) await kibanaServer.stop();
    if (esServer) await esServer.stop();
  });

  it('stays within heap (no OOM) when the install fan-out is bounded (the fix)', async () => {
    // Build the pool of upgraded-in-place over-limit indices.
    const fullMapping = buildMapping(FIELDS_PER_MAPPING);
    const refs: IndexRef[] = [];

    // eslint-disable-next-line no-console
    console.log(
      `[OOM repro] creating ${
        NUM_CONTEXTS * NUM_SPACES
      } over-limit indices (${NUM_CONTEXTS} contexts x ${NUM_SPACES} spaces), ${FIELDS_PER_MAPPING} fields each...`
    );

    for (let c = 0; c < NUM_CONTEXTS; c++) {
      for (let s = 0; s < NUM_SPACES; s++) {
        const alias = `.alerts-oomctx${c}.alerts-space-${s}`;
        const index = `.internal.${alias.slice(1)}-000001`;
        refs.push({ index, alias, isWriteIndex: true, isHidden: true });
      }
    }

    // Create them in modest batches so ES setup itself doesn't time out.
    const SETUP_BATCH = 20;
    for (let i = 0; i < refs.length; i += SETUP_BATCH) {
      const batch = refs.slice(i, i + SETUP_BATCH);
      await Promise.all(
        batch.map((r) =>
          esClient.indices.create({
            index: r.index,
            aliases: { [r.alias]: { is_write_index: true, is_hidden: true } },
            settings: {
              // single node: 0 replicas so each index is just 1 shard
              'index.number_of_replicas': 0,
              'index.number_of_shards': 1,
              'index.mapping.total_fields.limit': STARTING_LIMIT,
              'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
            },
            mappings: fullMapping,
          })
        )
      );
      // eslint-disable-next-line no-console
      console.log(`[OOM repro] created ${Math.min(i + SETUP_BATCH, refs.length)}/${refs.length}`);
    }

    // Sample heap so the climb (or flat line) is visible in the run output.
    const sampler = setInterval(() => {
      const m = process.memoryUsage();
      // eslint-disable-next-line no-console
      console.log(`[OOM repro] heapUsed=${mb(m.heapUsed)} rss=${mb(m.rss)}`);
    }, 1000);

    try {
      const sink: string[] = []; // retained debug strings (amplifier), never freed

      // One install: build its own ~2.6 MB mapping and update the index. The
      // mapping is held for the whole crawl, so retention scales with concurrency.
      const installOne = (r: IndexRef) => {
        const logger = makeRetainingDebugLogger(sink);
        const simulatedMapping = buildMapping(FIELDS_PER_MAPPING);
        return updateIndexMappingsAndSettings({
          logger,
          esClient,
          totalFieldsLimit: PRE_FIX_LIMIT,
          concreteIndices: [r],
          simulatedMapping,
        });
      };

      // Fan out through the real helper so its concurrency bound is what gates heap.
      const enqueued = refs.length * CONCURRENT_PASSES;

      const indexByKey = new Map<string, IndexRef>();
      const firstErrors: string[] = [];
      let maxConcurrent = 0;
      let inFlight = 0;
      const helper = createResourceInstallationHelper(
        makeRetainingDebugLogger(sink),
        Promise.resolve(successResult()),
        async (context: IRuleTypeAlerts, namespace: string) => {
          const ref = indexByKey.get(`${context.context}_${namespace}`);
          if (!ref) return;
          inFlight++;
          maxConcurrent = Math.max(maxConcurrent, inFlight);
          try {
            await installOne(ref);
          } catch (e) {
            if (firstErrors.length < 3) firstErrors.push(String(e?.message ?? e));
            throw e;
          } finally {
            inFlight--;
          }
        }
      );

      // Encode (pass) into the namespace and the index alias into the context so
      // every enqueued item is a distinct key (nothing dedupes).
      const keys: Array<{ context: string; namespace: string }> = [];
      for (let p = 0; p < CONCURRENT_PASSES; p++) {
        for (const r of refs) {
          const context = r.alias;
          const namespace = `pass-${p}`;
          indexByKey.set(`${context}_${namespace}`, r);
          keys.push({ context, namespace });
          helper.add({ context } as IRuleTypeAlerts, namespace);
        }
      }

      // eslint-disable-next-line no-console
      console.log(
        `[OOM repro] enqueued ${enqueued} installs through createResourceInstallationHelper (bounded). Waiting for all to settle...`
      );

      const results = await Promise.all(
        keys.map((k) => helper.getInitializedContext(k.context, k.namespace))
      );
      const ok = results.filter((rr) => rr.result).length;

      // eslint-disable-next-line no-console
      console.log(
        `[OOM repro] completed ${ok}/${enqueued} installs WITHOUT OOM (retained ${sink.length} debug strings). maxConcurrentInstalls=${maxConcurrent}. ` +
          `Bounded concurrency kept heap flat (the fix).` +
          (firstErrors.length ? ` firstErrors=${JSON.stringify(firstErrors)}` : '')
      );

      // The fix's contract: in-flight installs (and their mappings) stay bounded.
      expect(maxConcurrent).toBeGreaterThan(0);
      expect(maxConcurrent).toBeLessThanOrEqual(MAX_OBSERVED_CONCURRENCY_CEILING);
    } finally {
      clearInterval(sampler);
    }
  });
});

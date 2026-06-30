/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * REAL-ES reproduction of the alerting AAD "field-limit storm" against an
 * upgraded-in-place index (one whose mapping grew past total_fields.limit). Drives
 * `updateIndexMappingsAndSettings` against a real Elasticsearch (no mocks) and reads
 * live index settings to prove, pre-fix:
 *   1. the install path resets the limit back to the hard-coded ceiling (2500) and
 *      then crawls it up +1/+2/+3... per attempt until the mapping fits; and
 *   2. a "restart" (re-running the install) resets it to 2500 again and re-arms the
 *      whole climb — the wasted churn that, fanned out across many spaces/contexts,
 *      fills Kibana heap.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { updateIndexMappingsAndSettings } from '../alerts_service/lib/create_concrete_write_index';
import { setupTestServers } from './lib';

// Pre-#274024 hard-coded ceiling. The storm starts by resetting indices to this.
const PRE_FIX_LIMIT = 2500;

// The upgraded-in-place index ends up with MORE fields than the ceiling (the live
// repro saw ~2,704). Keep it close to the real number.
const OVER_LIMIT_FIELD_COUNT = 2704;

const INDEX = '.internal.alerts-oomrepro.alerts-default-000001';
const ALIAS = '.alerts-oomrepro.alerts-default';
const INDEX_TEMPLATE = `${ALIAS}-index-template`;

/** A keyword mapping with `count` distinct leaf fields. */
function buildMapping(count: number): MappingTypeMapping {
  const properties: Record<string, { type: 'keyword' }> = {};
  for (let i = 0; i < count; i++) {
    properties[`oom_repro_field_${i}`] = { type: 'keyword' };
  }
  return { dynamic: false, properties };
}

async function getLiveFieldLimit(
  esClient: ElasticsearchClient,
  index: string
): Promise<number | undefined> {
  const settings = await esClient.indices.getSettings({ index, include_defaults: true });
  const indexName = Object.keys(settings)[0];
  const raw =
    settings[indexName]?.settings?.index?.mapping?.total_fields?.limit ??
    settings[indexName]?.defaults?.index?.mapping?.total_fields?.limit;
  return raw != null ? Number(raw) : undefined;
}

// Captures info/debug into `sink` and echoes warn/error so failures are visible.
function makeCapturingLogger(sink: string[]): Logger {
  const base = loggingSystemMock.createLogger();
  (base.info as jest.Mock).mockImplementation((msg: unknown) => {
    if (typeof msg === 'string') sink.push(msg);
  });
  (base.debug as jest.Mock).mockImplementation((msg: unknown) => {
    if (typeof msg === 'string') sink.push(msg);
  });
  (base.warn as jest.Mock).mockImplementation((msg: unknown) => {
    // eslint-disable-next-line no-console
    console.log(`[WARN] ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  });
  (base.error as jest.Mock).mockImplementation((msg: unknown) => {
    // eslint-disable-next-line no-console
    console.log(`[ERROR] ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  });
  return base;
}

const concreteIndexInfo = {
  index: INDEX,
  alias: ALIAS,
  isWriteIndex: true,
  isHidden: true,
};

describe('alerting AAD field-limit storm against REAL Elasticsearch', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let esClient: ElasticsearchClient;
  let logger: Logger;
  let logs: string[] = [];

  beforeAll(async () => {
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;
    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    // Build the "upgraded-in-place" world once: a template + concrete index already
    // carrying a limit just above the field count, with the full mapping applied.
    const fullMapping = buildMapping(OVER_LIMIT_FIELD_COUNT);
    const startingLimit = OVER_LIMIT_FIELD_COUNT + 10; // it had converged higher

    await esClient.indices.putIndexTemplate({
      name: INDEX_TEMPLATE,
      index_patterns: [`${ALIAS}-*`],
      template: {
        settings: {
          'index.mapping.total_fields.limit': startingLimit,
          'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
        },
        mappings: { dynamic: false },
      },
    });

    await esClient.indices.create({
      index: INDEX,
      aliases: { [ALIAS]: { is_write_index: true, is_hidden: true } },
      settings: {
        'index.mapping.total_fields.limit': startingLimit,
        'index.mapping.total_fields.ignore_dynamic_beyond_limit': true,
      },
      mappings: fullMapping,
    });
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(() => {
    logs = [];
    logger = makeCapturingLogger(logs);
  });

  it('resets the live limit to 2500 then CRAWLS it back up past the field count', async () => {
    // Sanity: the index starts already-converged above the ceiling.
    const startLimit = await getLiveFieldLimit(esClient, INDEX);
    expect(startLimit).toBeGreaterThan(OVER_LIMIT_FIELD_COUNT);

    const simulatedMapping = buildMapping(OVER_LIMIT_FIELD_COUNT);

    // Drive the EXACT RCA function against real ES with the pre-fix ceiling.
    await updateIndexMappingsAndSettings({
      logger,
      esClient,
      totalFieldsLimit: PRE_FIX_LIMIT,
      concreteIndices: [concreteIndexInfo],
      simulatedMapping,
    });

    // The reset put the limit back to 2500 first (the crawl starts there)...
    const firstIncreaseLog = logs.find((m) => m.includes('has been increased from 2500 to'));
    expect(firstIncreaseLog).toBeDefined();

    // ...and it climbed in many small +1/+2/+3 steps, not one jump.
    const increaseLogs = logs.filter((m) =>
      m.includes(`total_fields.limit of ${ALIAS} has been increased`)
    );
    expect(increaseLogs.length).toBeGreaterThan(5);
    // eslint-disable-next-line no-console
    console.log(`[MEASURED real-ES] crawl steps: ${increaseLogs.length}`);

    // The live limit ended up crawled from 2500 back up past the field count.
    const endLimit = await getLiveFieldLimit(esClient, INDEX);
    expect(endLimit).toBeGreaterThanOrEqual(OVER_LIMIT_FIELD_COUNT);
    // eslint-disable-next-line no-console
    console.log(`[MEASURED real-ES] limit ${startLimit} -> reset 2500 -> crawled to ${endLimit}`);
  });

  it('a "restart" resets the live limit back to 2500 and re-arms the climb (the loop)', async () => {
    // Precondition: the index is converged above the ceiling from the prior run.
    const before = await getLiveFieldLimit(esClient, INDEX);
    expect(before).toBeGreaterThanOrEqual(OVER_LIMIT_FIELD_COUNT);

    // Re-run the install path (as a restart / any subsequent pass would).
    await updateIndexMappingsAndSettings({
      logger,
      esClient,
      totalFieldsLimit: PRE_FIX_LIMIT,
      concreteIndices: [concreteIndexInfo],
      simulatedMapping: buildMapping(OVER_LIMIT_FIELD_COUNT),
    });

    // It reset back to 2500 and crawled AGAIN — pure wasted churn against ES that
    // re-occurs on every restart, which is what rebuilds the storm at scale.
    const reIncreaseLogs = logs.filter((m) =>
      m.includes(`total_fields.limit of ${ALIAS} has been increased`)
    );
    expect(reIncreaseLogs.length).toBeGreaterThan(5);
    expect(logs.some((m) => m.includes('has been increased from 2500 to'))).toBe(true);

    const after = await getLiveFieldLimit(esClient, INDEX);
    expect(after).toBeGreaterThanOrEqual(OVER_LIMIT_FIELD_COUNT);
  });
});

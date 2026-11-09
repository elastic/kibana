/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { type TestElasticsearchUtils, createTestServers } from '@kbn/core-test-helpers-kbn-server';

import {
  BACKFILL_SCRIPT,
  BACKFILL_TARGETS,
  backfillIndex,
} from '../services/backfill_policy_base_id';
import {
  AGENT_POLICY_INDEX,
  AGENT_POLICY_SENTINEL_VERSION,
  AGENT_POLICY_VERSION_SEPARATOR,
} from '../../common/constants';

const INDEX = 'test-fleet-policies-backfill';
const DOC_COUNT = 40;
const DOC_SIZE_BYTES = 2 * 1024 * 1024;
// Below the source of all the documents (80 MB), above the source of a batch of 10 (20 MB)
const REQUEST_BREAKER_LIMIT = '50mb';
const POLICY_IDS = [
  'policy1',
  `policy1#9.4`,
  `policy1#${AGENT_POLICY_SENTINEL_VERSION}`,
  'other#v2',
];
const BASE_IDS: Record<string, string> = {
  policy1: 'policy1',
  'policy1#9.4': 'policy1',
  [`policy1#${AGENT_POLICY_SENTINEL_VERSION}`]: 'policy1',
  'other#v2': 'other#v2',
};

describe('policy_base_id backfill on large documents', () => {
  let esServer: TestElasticsearchUtils;
  let esClient: Client;

  const seed = async () => {
    await esClient.indices.delete({ index: INDEX, ignore_unavailable: true });
    await esClient.indices.create({
      index: INDEX,
      mappings: {
        dynamic: false,
        properties: {
          policy_id: { type: 'keyword' },
          policy_base_id: { type: 'keyword' },
          data: { type: 'object', enabled: false },
        },
      },
    });
    const blob = 'x'.repeat(DOC_SIZE_BYTES);
    // A few documents per request, below `http.max_content_length`
    for (let i = 0; i < DOC_COUNT; i += 5) {
      await esClient.bulk({
        index: INDEX,
        operations: Array.from({ length: 5 }, (_, j) => [
          { index: { _id: `doc-${i + j}` } },
          { policy_id: POLICY_IDS[(i + j) % POLICY_IDS.length], data: { blob } },
        ]).flat(),
      });
    }
    // One document already backfilled, which must not change
    await esClient.index({
      index: INDEX,
      id: 'already-backfilled',
      document: { policy_id: 'policy1#9.4', policy_base_id: 'kept' },
    });
    await esClient.indices.refresh({ index: INDEX });
  };

  const setRequestBreakerLimit = (limit: string | null) =>
    esClient.cluster.putSettings({
      persistent: { 'indices.breaker.request.limit': limit },
    });

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: { es: { license: 'basic' } },
    });
    esServer = await startES();
    esClient = esServer.es.getClient();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  beforeEach(async () => {
    await seed();
    await setRequestBreakerLimit(REQUEST_BREAKER_LIMIT);
  });

  afterEach(async () => {
    await setRequestBreakerLimit(null);
  });

  it('trips the request breaker with an unbounded update by query', async () => {
    await expect(
      esClient.updateByQuery({
        index: INDEX,
        conflicts: 'proceed',
        script: {
          lang: 'painless',
          source: BACKFILL_SCRIPT,
          params: {
            separator: AGENT_POLICY_VERSION_SEPARATOR,
            sentinelVersion: AGENT_POLICY_SENTINEL_VERSION,
          },
        },
        query: { bool: { must_not: [{ exists: { field: 'policy_base_id' } }] } },
      })
    ).rejects.toThrow(/circuit_breaking_exception/);
  });

  it('backfills every document in bounded batches, then only counts', async () => {
    const logger = loggingSystemMock.createLogger();
    // The batch sizes of `.fleet-policies`, on the test index
    const target = {
      ...BACKFILL_TARGETS.find(({ index }) => index === AGENT_POLICY_INDEX)!,
      index: INDEX,
      label: 'test',
    };

    const result = await backfillIndex(esClient as unknown as ElasticsearchClient, target, {
      logger,
    });

    expect(result).toEqual({ label: 'test', status: 'completed', updated: DOC_COUNT });
    const { hits } = await esClient.search<{ policy_id: string; policy_base_id?: string }>({
      index: INDEX,
      size: DOC_COUNT + 1,
      _source: ['policy_id', 'policy_base_id'],
    });
    for (const hit of hits.hits) {
      const { policy_id: policyId, policy_base_id: policyBaseId } = hit._source!;
      expect(policyBaseId).toBe(hit._id === 'already-backfilled' ? 'kept' : BASE_IDS[policyId]);
    }

    const updateByQuery = jest.spyOn(esClient, 'updateByQuery');
    const secondRun = await backfillIndex(esClient as unknown as ElasticsearchClient, target, {
      logger,
    });
    expect(secondRun).toEqual({ label: 'test', status: 'completed', updated: 0 });
    expect(updateByQuery).not.toHaveBeenCalled();
  });
});

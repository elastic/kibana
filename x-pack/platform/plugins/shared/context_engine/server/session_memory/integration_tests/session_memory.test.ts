/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsTestCluster } from '@kbn/test';
import { createEsClientForTesting, createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { SESSION_MEMORY_DATA_STREAM } from '../data_streams';
import { createSessionMemoryService } from '../service';
import type { SessionMemoryService, StoredSessionMemory } from '../types';

describe('session memory', () => {
  jest.setTimeout(180_000);

  let esServer: EsTestCluster;
  let esClient: ReturnType<typeof createEsClientForTesting>;
  let service: SessionMemoryService;

  const jdoe = { space: 'default', userId: 'jdoe' };

  const refresh = () =>
    esClient.indices.refresh({ index: SESSION_MEMORY_DATA_STREAM, ignore_unavailable: true });

  // Writing `content` runs semantic_text inference, which the test cluster's basic license does not
  // allow. Memories are seeded without content, which is enough for forget.
  const seed = async (...documents: StoredSessionMemory[]) => {
    const response = await esClient.bulk({
      operations: documents.flatMap((document) => [
        { create: { _index: SESSION_MEMORY_DATA_STREAM } },
        document,
      ]),
      refresh: true,
    });
    expect(response.errors).toBe(false);
  };

  // Seeded revisions predate every timestamp the service writes.
  const revision = (id: string, timestamp: string, scope = jdoe): StoredSessionMemory => ({
    '@timestamp': timestamp,
    id,
    space: scope.space,
    session_id: 'session-1',
    user_id: scope.userId,
    ai_index_id: ['ops-memory'],
    attributes: { incident: 'INC-4211' },
  });

  const countRevisions = async (id: string) => {
    const { count } = await esClient.count({
      index: SESSION_MEMORY_DATA_STREAM,
      query: { term: { id } },
    });
    return count;
  };

  beforeAll(async () => {
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'error' }),
    });
    await esServer.start();
    esClient = createEsClientForTesting({
      esUrl: esServer.getHostUrls()[0],
      headers: { 'x-elastic-product-origin': 'kibana' },
    });
    service = createSessionMemoryService(esClient);
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it('finds nothing before Elasticsearch creates the stream', async () => {
    await expect(service.forget(jdoe, ['missing'])).resolves.toEqual([
      { id: 'missing', outcome: 'not_found' },
    ]);
  });

  it('hides a memory from other users and other spaces', async () => {
    await seed(revision('isolated', '2026-11-08T09:00:00.000Z'));

    const otherUser = { space: 'default', userId: 'asmith' };
    const otherSpace = { space: 'marketing', userId: 'jdoe' };
    await expect(service.forget(otherUser, ['isolated'])).resolves.toEqual([
      { id: 'isolated', outcome: 'not_found' },
    ]);
    await expect(service.forget(otherSpace, ['isolated'])).resolves.toEqual([
      { id: 'isolated', outcome: 'not_found' },
    ]);

    await expect(service.forget(jdoe, ['isolated'])).resolves.toEqual([
      { id: 'isolated', outcome: 'forgotten' },
    ]);
  });

  it('forgets each memory by its latest revision and reports every id', async () => {
    await seed(
      revision('live', '2026-11-08T09:00:00.000Z'),
      revision('live', '2026-11-08T10:00:00.000Z'),
      revision('forgotten', '2026-11-08T09:00:00.000Z'),
      {
        ...revision('forgotten', '2026-11-08T10:00:00.000Z'),
        deleted_at: '2026-11-08T10:00:00.000Z',
      }
    );

    await expect(service.forget(jdoe, ['live', 'forgotten', 'unknown'])).resolves.toEqual([
      { id: 'live', outcome: 'forgotten' },
      { id: 'forgotten', outcome: 'already_forgotten' },
      { id: 'unknown', outcome: 'not_found' },
    ]);
    await refresh();

    expect(await countRevisions('live')).toBe(3);
    expect(await countRevisions('forgotten')).toBe(2);
    await expect(service.forget(jdoe, ['live'])).resolves.toEqual([
      { id: 'live', outcome: 'already_forgotten' },
    ]);
  });
});

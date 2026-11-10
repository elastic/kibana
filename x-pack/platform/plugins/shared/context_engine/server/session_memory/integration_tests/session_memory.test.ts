/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsTestCluster } from '@kbn/test';
import { createEsClientForTesting, createTestEsCluster } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { SESSION_EVENTS_DATA_STREAM, SESSION_MEMORY_DATA_STREAM } from '../data_streams';
import { createSessionMemoryService } from '../service';
import type { SessionMemoryService, StoredSessionMemory } from '../types';

const STREAMS = [SESSION_MEMORY_DATA_STREAM, SESSION_EVENTS_DATA_STREAM];

describe('session memory', () => {
  jest.setTimeout(180_000);

  let esServer: EsTestCluster;
  let esClient: ReturnType<typeof createEsClientForTesting>;
  let service: SessionMemoryService;

  const jdoe = { space: 'default', userId: 'jdoe' };

  // The service never refreshes, so tests make their writes searchable before reading them back.
  const refresh = () => esClient.indices.refresh({ index: STREAMS.join(',') });

  // Writing `content` runs semantic_text inference, which the test cluster's basic license does not
  // allow. Memories are seeded without content, which is enough for forget and hardDelete; remember
  // and get are covered by the unit tests.
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
      // Elasticsearch serves a system data stream only to a caller sending a product origin. Core's
      // client always sends it, which is why the service never has to.
      headers: { 'x-elastic-product-origin': 'kibana' },
    });
    service = createSessionMemoryService({ esClient });

    // Elasticsearch creates each stream on its first write.
    await seed(revision('first-write', '2026-11-08T08:00:00.000Z'));
    await service.saveEvent(jdoe, { sessionId: 'first-write', transcript: 'User: hi' });
    await refresh();
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  describe('data streams', () => {
    it('creates both streams as hidden system data streams with 90 day retention', async () => {
      const { data_streams: dataStreams } = await esClient.indices.getDataStream({
        name: STREAMS.join(','),
      });

      expect(
        dataStreams.map(({ name, hidden, system, lifecycle }) => ({
          name,
          hidden,
          system,
          retention: lifecycle?.data_retention,
        }))
      ).toEqual(
        expect.arrayContaining(
          STREAMS.map((name) => ({ name, hidden: true, system: true, retention: '90d' }))
        )
      );
    });

    it('serves the streams only to callers sending the Kibana product origin', async () => {
      const unscopedClient = createEsClientForTesting({ esUrl: esServer.getHostUrls()[0] });

      await expect(unscopedClient.search({ index: SESSION_MEMORY_DATA_STREAM })).rejects.toThrow();
    });

    it('maps memory content as text with a semantic_text subfield', async () => {
      const response = await esClient.indices.getMapping({ index: SESSION_MEMORY_DATA_STREAM });
      const [{ mappings }] = Object.values(response);

      expect(mappings.dynamic).toBe('strict');
      expect(mappings.properties?.content).toMatchObject({
        type: 'text',
        fields: { semantic_text: { type: 'semantic_text' } },
      });
    });

    it('keeps event transcripts out of the search index', async () => {
      await expect(
        esClient.search({
          index: SESSION_EVENTS_DATA_STREAM,
          query: { match: { transcript: 'hi' } },
        })
      ).rejects.toThrow(/not indexed/);
    });

    it.each(STREAMS)('rejects documents with undeclared fields in %s', async (name) => {
      await expect(
        esClient.index({
          index: name,
          op_type: 'create',
          document: { ...revision('strict', '2026-11-08T08:00:00.000Z'), agent_id: 'agent-1' },
        })
      ).rejects.toThrow(/strict_dynamic_mapping_exception/);
    });
  });

  describe('service', () => {
    it('hides a memory from other users and other spaces', async () => {
      await seed(revision('isolated', '2026-11-08T09:00:00.000Z'));

      const otherUser = { space: 'default', userId: 'asmith' };
      const otherSpace = { space: 'marketing', userId: 'jdoe' };
      await expect(service.forget(otherUser, ['isolated'])).resolves.toEqual({
        isolated: 'not_found',
      });
      await expect(service.hardDelete(otherSpace, ['isolated'])).resolves.toEqual({
        deletedDocuments: 0,
      });

      await expect(service.forget(jdoe, ['isolated'])).resolves.toEqual({
        isolated: 'forgotten',
      });
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

      await expect(service.forget(jdoe, ['live', 'forgotten', 'unknown'])).resolves.toEqual({
        live: 'forgotten',
        forgotten: 'already_forgotten',
        unknown: 'not_found',
      });
      await refresh();

      // Only the live memory got a tombstone, and the next forget sees it as the latest revision.
      expect(await countRevisions('live')).toBe(3);
      expect(await countRevisions('forgotten')).toBe(2);
      await expect(service.forget(jdoe, ['live'])).resolves.toEqual({ live: 'already_forgotten' });
    });

    it('hard deletes every revision of a memory, tombstones included', async () => {
      await seed(
        revision('deleted', '2026-11-08T09:00:00.000Z'),
        revision('deleted', '2026-11-08T10:00:00.000Z'),
        revision('deleted', '2026-11-08T09:00:00.000Z', { space: 'default', userId: 'asmith' })
      );
      await service.forget(jdoe, ['deleted']);
      await refresh();

      await expect(service.hardDelete(jdoe, ['deleted'])).resolves.toEqual({ deletedDocuments: 3 });
      await refresh();

      // Another user's memory under the same id stays.
      expect(await countRevisions('deleted')).toBe(1);
    });

    it('stores one session event per turn', async () => {
      const { id } = await service.saveEvent(jdoe, {
        sessionId: 'session-events',
        turnId: 'turn-1',
        transcript: 'User: is checkout healthy?\nAgent: yes',
        aiIndexIds: ['ops-memory'],
      });
      await refresh();

      const response = await esClient.search({
        index: SESSION_EVENTS_DATA_STREAM,
        query: { term: { session_id: 'session-events' } },
      });
      expect(response.hits.hits.map(({ _source }) => _source)).toEqual([
        {
          '@timestamp': expect.any(String),
          id,
          space: 'default',
          session_id: 'session-events',
          turn_id: 'turn-1',
          user_id: 'jdoe',
          ai_index_id: ['ops-memory'],
          transcript: 'User: is checkout healthy?\nAgent: yes',
        },
      ]);
    });
  });
});

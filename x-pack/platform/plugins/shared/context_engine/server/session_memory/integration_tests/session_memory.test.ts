/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { sessionEventsMappings, sessionMemoryMappings } from '../data_streams';
import {
  registerSessionMemoryDataStreams,
  SESSION_EVENTS_DATA_STREAM,
  SESSION_MEMORY_DATA_STREAM,
} from '../data_streams';
import { createSessionMemoryService, getSessionMemoryService } from '../service';
import type { SessionMemoryService, StoredSessionEvent, StoredSessionMemory } from '../types';

const STREAMS = [SESSION_MEMORY_DATA_STREAM, SESSION_EVENTS_DATA_STREAM];

describe('session memory', () => {
  jest.setTimeout(180_000);

  let manageES: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let esClient: ElasticsearchClient;
  let service: SessionMemoryService;
  let pluginService: SessionMemoryService;

  const jdoe = { space: 'default', userId: 'jdoe' };

  // The service never refreshes, so tests make their writes searchable before reading them back.
  const refresh = () => esClient.indices.refresh({ index: STREAMS.join(',') });

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    manageES = await startES();
    root = createRootWithCorePlugins({}, { oss: true });
    await root.preboot();
    const coreSetup = await root.setup();
    registerSessionMemoryDataStreams(coreSetup.dataStreams);
    const coreStart = await root.start();
    esClient = coreStart.elasticsearch.client.asInternalUser;

    // Built from the same clients the plugin uses, with a clock that moves one second per write, so
    // the order of revisions never depends on two writes landing in different milliseconds.
    const [memoryClient, eventsClient] = await Promise.all([
      coreStart.dataStreams.initializeClient<typeof sessionMemoryMappings, StoredSessionMemory>(
        SESSION_MEMORY_DATA_STREAM
      ),
      coreStart.dataStreams.initializeClient<typeof sessionEventsMappings, StoredSessionEvent>(
        SESSION_EVENTS_DATA_STREAM
      ),
    ]);
    let clock = Date.parse('2026-11-09T10:00:00.000Z');
    service = createSessionMemoryService({
      memoryClient,
      eventsClient,
      esClient,
      now: () => new Date((clock += 1000)),
    });
    // What the plugin hands to other plugins, for the tests that need no fixed clock.
    pluginService = await getSessionMemoryService(coreStart);
  });

  afterAll(async () => {
    await root?.shutdown();
    await manageES?.stop();
  });

  describe('data streams', () => {
    const sharedFields = {
      '@timestamp': new Date().toISOString(),
      id: 'doc-1',
      space: 'default',
      session_id: 'session-1',
      user_id: 'jdoe',
    };
    const sessionEvent = {
      ...sharedFields,
      transcript: 'User: checkout is slow\nAgent: rolled back to 3.1',
    };

    it('creates both streams hidden, not as Elasticsearch system data streams, with 90 day retention', async () => {
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
          STREAMS.map((name) => ({ name, hidden: true, system: false, retention: '90d' }))
        )
      );
    });

    it('maps memory content as text with a semantic_text subfield and nothing else', async () => {
      const response = await esClient.indices.getMapping({ index: SESSION_MEMORY_DATA_STREAM });
      const [{ mappings }] = Object.values(response);

      expect(mappings.dynamic).toBe('strict');
      expect(mappings.properties?.content).toMatchObject({
        type: 'text',
        fields: { semantic_text: { type: 'semantic_text' } },
      });
      expect(Object.keys(mappings.properties?.content?.fields ?? {})).toEqual(['semantic_text']);
    });

    it('stores a session event and keeps its transcript out of the search index', async () => {
      await esClient.index({
        index: SESSION_EVENTS_DATA_STREAM,
        op_type: 'create',
        document: sessionEvent,
        refresh: true,
      });

      const bySession = await esClient.search({
        index: SESSION_EVENTS_DATA_STREAM,
        query: { term: { session_id: sessionEvent.session_id } },
      });
      expect(bySession.hits.hits.map(({ _source }) => _source)).toEqual([sessionEvent]);

      await expect(
        esClient.search({
          index: SESSION_EVENTS_DATA_STREAM,
          query: { match: { transcript: 'checkout' } },
        })
      ).rejects.toThrow(/not indexed/);
    });

    it.each(STREAMS)('rejects documents with undeclared fields in %s', async (name) => {
      await expect(
        esClient.index({
          index: name,
          op_type: 'create',
          document: { ...sharedFields, agent_id: 'agent-1' },
        })
      ).rejects.toThrow(/strict_dynamic_mapping_exception/);
    });
  });

  describe('service', () => {
    // Writing `content` runs semantic_text inference, which the test cluster's basic license does not
    // allow. These tests seed revisions without content, which is enough for forget and hardDelete;
    // remember and get are covered by the unit tests.
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

    // Seeded revisions predate every timestamp the services write.
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

    it('hides a memory from other users and other spaces', async () => {
      await seed(revision('isolated', '2026-11-08T09:00:00.000Z'));

      const otherUser = { space: 'default', userId: 'asmith' };
      const otherSpace = { space: 'marketing', userId: 'jdoe' };
      await expect(pluginService.forget(otherUser, ['isolated'])).resolves.toEqual({
        isolated: 'not_found',
      });
      await expect(pluginService.hardDelete(otherSpace, ['isolated'])).resolves.toEqual({
        deletedDocuments: 0,
      });

      await expect(pluginService.forget(jdoe, ['isolated'])).resolves.toEqual({
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

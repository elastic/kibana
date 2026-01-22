/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { ALERT_ACTIONS_DATA_STREAM } from '../../../resources/alert_actions';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/alert_events';
import { LoggerService } from '../../services/logger_service/logger_service';
import { createMockLoggerService } from '../../services/logger_service/logger_service.mock';
import { StorageService } from '../../services/storage_service/storage_service';
import { DispatcherService } from '../dispatcher';
import { setupTestServers } from './setup_test_servers';

const TOTAL_FIELDS_LIMIT = 2500;

interface TestKibanaServer extends TestKibanaUtils {
  root: TestKibanaUtils['root'];
  coreSetup: TestKibanaUtils['coreSetup'];
  coreStart: TestKibanaUtils['coreStart'];
  stop: () => Promise<void>;
}

/**
 * Test dataset representing alert events for a single rule with multiple episodes:
 *
 * Episode 1: breach -> breach -> breach -> recovering -> inactive
 * Episode 2: breach -> recovering -> inactive
 * Episode 3: breach (still active)
 */
const ALERT_EVENTS_TEST_DATA = [
  {
    '@timestamp': '2026-01-22T07:50:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-3',
    status: 'breach',
    episode_status: 'active',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:45:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-2',
    status: 'recover',
    episode_status: 'inactive',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:40:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-2',
    status: 'recover',
    episode_status: 'recovering',
    episode_status_count: 1,
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:35:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-2',
    status: 'breach',
    episode_status: 'active',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:30:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-1',
    status: 'recover',
    episode_status: 'inactive',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:25:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-1',
    status: 'recover',
    episode_status: 'recovering',
    episode_status_count: 1,
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:20:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-1',
    status: 'breach',
    episode_status: 'active',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:15:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-1',
    status: 'breach',
    episode_status: 'active',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:10:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-1',
    status: 'breach',
    episode_status: 'active',
    source: 'internal',
  },
];

describe('DispatcherService integration tests', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaServer;
  let esClient: ElasticsearchClient;
  let dispatcherService: DispatcherService;
  let storageService: StorageService;
  let mockLoggerService: ReturnType<typeof createMockLoggerService>;

  beforeAll(async () => {
    const servers = await setupTestServers();
    esServer = servers.esServer;
    kibanaServer = servers.kibanaServer as TestKibanaServer;
    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    // Create data streams
    await createAlertEventsDataStream(esClient);
    await createAlertActionsDataStream(esClient);
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  beforeEach(async () => {
    // Clean up data streams before each test
    await cleanupDataStreams(esClient);

    // Setup services
    mockLoggerService = createMockLoggerService();
    const logger = loggerMock.create();
    const loggerService = new LoggerService(logger);
    storageService = new StorageService(esClient, loggerService);

    dispatcherService = new DispatcherService(
      esClient,
      mockLoggerService.loggerService,
      storageService
    );
  });

  describe('when there are no alert events', () => {
    it('should not dispatch any episodes', async () => {
      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      expect(result.startedAt).toBeDefined();

      // Verify no fire-events were created
      const actionsResponse = await esClient.search({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: { match_all: {} },
      });

      expect(actionsResponse.hits.hits).toHaveLength(0);
    });
  });

  describe('when there are alert events without prior fire-events', () => {
    beforeEach(async () => {
      // Seed test data
      await seedAlertEvents(esClient, ALERT_EVENTS_TEST_DATA);
    });

    it('should dispatch all unique episodes', async () => {
      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      expect(result.startedAt).toBeDefined();

      // Wait for ES to refresh
      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });

      // Verify fire-events were created for each episode
      const actionsResponse = await esClient.search({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: { match_all: {} },
        size: 100,
      });

      const fireEvents = actionsResponse.hits.hits.map((hit) => hit._source as Record<string, any>);

      // Should have dispatched 3 episodes
      expect(fireEvents).toHaveLength(3);

      // Verify all fire-events have the correct structure
      fireEvents.forEach((event) => {
        expect(event).toMatchObject({
          '@timestamp': expect.any(String),
          group_hash: 'rule-1-series-1',
          rule_id: 'rule-1',
          actor: 'system',
          action_type: 'fire-event',
          source: 'internal',
        });
      });

      // Verify all three episodes are present
      const episodeIds = fireEvents.map((event) => event.episode_id).sort();
      expect(episodeIds).toEqual([
        'rule-1-series-1-episode-1',
        'rule-1-series-1-episode-2',
        'rule-1-series-1-episode-3',
      ]);
    });
  });

  describe('when some episodes already have fire-events', () => {
    beforeEach(async () => {
      // Seed alert events
      await seedAlertEvents(esClient, ALERT_EVENTS_TEST_DATA);

      // Seed a fire-event for episode-1 that is newer than its last event
      await seedAlertActions(esClient, [
        {
          '@timestamp': '2026-01-22T07:31:00.000Z', // After episode-1's last event (07:30)
          group_hash: 'rule-1-series-1',
          last_series_event_timestamp: '2026-01-22T07:30:00.000Z',
          actor: 'system',
          action_type: 'fire-event',
          episode_id: 'rule-1-series-1-episode-1',
          rule_id: 'rule-1',
          source: 'internal',
        },
      ]);
    });

    it('should only dispatch episodes that need it', async () => {
      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      expect(result.startedAt).toBeDefined();

      // Wait for ES to refresh
      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });

      // Verify fire-events
      const actionsResponse = await esClient.search({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: {
          bool: {
            must: [
              { term: { action_type: 'fire-event' } },
              { range: { '@timestamp': { gte: '2026-01-22T07:31:01.000Z' } } },
            ],
          },
        },
        size: 100,
      });

      const newFireEvents = actionsResponse.hits.hits.map(
        (hit) => hit._source as Record<string, any>
      );

      // Should have dispatched only 2 episodes (episode-2 and episode-3)
      // episode-1 already has a fire-event newer than its last event
      expect(newFireEvents).toHaveLength(2);

      const episodeIds = newFireEvents.map((event) => event.episode_id).sort();
      expect(episodeIds).toEqual(['rule-1-series-1-episode-2', 'rule-1-series-1-episode-3']);
    });
  });

  describe('when fire-event is older than latest alert event', () => {
    beforeEach(async () => {
      // Seed alert events
      await seedAlertEvents(esClient, ALERT_EVENTS_TEST_DATA);

      // Seed a fire-event for episode-3 that is OLDER than its last event
      await seedAlertActions(esClient, [
        {
          '@timestamp': '2026-01-22T07:49:00.000Z', // Before episode-3's last event (07:50)
          group_hash: 'rule-1-series-1',
          last_series_event_timestamp: '2026-01-22T07:48:00.000Z',
          actor: 'system',
          action_type: 'fire-event',
          episode_id: 'rule-1-series-1-episode-3',
          rule_id: 'rule-1',
          source: 'internal',
        },
      ]);
    });

    it('should re-dispatch episodes with newer events', async () => {
      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      expect(result.startedAt).toBeDefined();

      // Wait for ES to refresh
      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });

      // Verify fire-events
      const actionsResponse = await esClient.search({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: {
          bool: {
            must: [
              { term: { action_type: 'fire-event' } },
              { range: { '@timestamp': { gte: '2026-01-22T07:49:01.000Z' } } },
            ],
          },
        },
        size: 100,
      });

      const newFireEvents = actionsResponse.hits.hits.map(
        (hit) => hit._source as Record<string, any>
      );

      // Should have dispatched all 3 episodes because:
      // - episode-3 has a newer event than its fire-event
      // - episode-1 and episode-2 have no fire-events
      expect(newFireEvents).toHaveLength(3);

      const episodeIds = newFireEvents.map((event) => event.episode_id).sort();
      expect(episodeIds).toEqual([
        'rule-1-series-1-episode-1',
        'rule-1-series-1-episode-2',
        'rule-1-series-1-episode-3',
      ]);
    });
  });
});

async function cleanupDataStreams(esClient: ElasticsearchClient): Promise<void> {
  try {
    // Delete all documents from both data streams
    await esClient.deleteByQuery({
      index: ALERT_EVENTS_DATA_STREAM,
      query: { match_all: {} },
      refresh: true,
    });
  } catch (error) {
    // Ignore errors if the data stream doesn't exist or is empty
  }

  try {
    await esClient.deleteByQuery({
      index: ALERT_ACTIONS_DATA_STREAM,
      query: { match_all: {} },
      refresh: true,
    });
  } catch (error) {
    // Ignore errors if the data stream doesn't exist or is empty
  }
}

async function seedAlertEvents(
  esClient: ElasticsearchClient,
  events: Array<Record<string, any>>
): Promise<void> {
  const operations = events.flatMap((doc) => [
    { index: { _index: ALERT_EVENTS_DATA_STREAM } },
    doc,
  ]);

  await esClient.bulk({
    operations,
    refresh: 'wait_for',
  });
}

async function seedAlertActions(
  esClient: ElasticsearchClient,
  actions: Array<Record<string, any>>
): Promise<void> {
  const operations = actions.flatMap((doc) => [
    { index: { _index: ALERT_ACTIONS_DATA_STREAM } },
    doc,
  ]);

  await esClient.bulk({
    operations,
    refresh: 'wait_for',
  });
}

async function createAlertEventsDataStream(esClient: ElasticsearchClient): Promise<void> {
  const componentTemplateName = `${ALERT_EVENTS_DATA_STREAM}-schema@component`;
  const indexTemplateName = `${ALERT_EVENTS_DATA_STREAM}-schema@index-template`;

  await esClient.cluster.putComponentTemplate({
    name: componentTemplateName,
    template: {
      mappings: {
        dynamic: false,
        properties: {
          '@timestamp': { type: 'date' },
          type: { type: 'keyword' },
          rule: {
            properties: {
              id: { type: 'keyword' },
            },
          },
          source: { type: 'keyword' },
          status: { type: 'keyword' },
          group_hash: { type: 'keyword' },
          episode_id: { type: 'keyword' },
          episode_status: { type: 'keyword' },
          episode_status_count: { type: 'long' },
        },
      },
    },
    _meta: {
      managed: true,
      description: `${ALERT_EVENTS_DATA_STREAM} schema component template`,
    },
  });

  await esClient.indices.putIndexTemplate({
    name: indexTemplateName,
    index_patterns: [ALERT_EVENTS_DATA_STREAM],
    data_stream: { hidden: true },
    composed_of: [componentTemplateName],
    priority: 500,
    template: {
      settings: {
        'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
      },
    },
    _meta: {
      managed: true,
      description: `${ALERT_EVENTS_DATA_STREAM} index template`,
    },
  });

  await esClient.indices.createDataStream({
    name: ALERT_EVENTS_DATA_STREAM,
  });
}

async function createAlertActionsDataStream(esClient: ElasticsearchClient): Promise<void> {
  const componentTemplateName = `${ALERT_ACTIONS_DATA_STREAM}-schema@component`;
  const indexTemplateName = `${ALERT_ACTIONS_DATA_STREAM}-schema@index-template`;

  await esClient.cluster.putComponentTemplate({
    name: componentTemplateName,
    template: {
      mappings: {
        dynamic: false,
        properties: {
          '@timestamp': { type: 'date' },
          group_hash: { type: 'keyword' },
          last_series_event_timestamp: { type: 'date' },
          expiry: { type: 'date' },
          actor: { type: 'keyword' },
          action_type: { type: 'keyword' },
          episode_id: { type: 'keyword' },
          rule_id: { type: 'keyword' },
          source: { type: 'keyword' },
        },
      },
    },
    _meta: {
      managed: true,
      description: `${ALERT_ACTIONS_DATA_STREAM} schema component template`,
    },
  });

  await esClient.indices.putIndexTemplate({
    name: indexTemplateName,
    index_patterns: [ALERT_ACTIONS_DATA_STREAM],
    data_stream: { hidden: true },
    composed_of: [componentTemplateName],
    priority: 500,
    template: {
      settings: {
        'index.mapping.total_fields.limit': TOTAL_FIELDS_LIMIT,
      },
    },
    _meta: {
      managed: true,
      description: `${ALERT_ACTIONS_DATA_STREAM} index template`,
    },
  });

  await esClient.indices.createDataStream({
    name: ALERT_ACTIONS_DATA_STREAM,
  });
}

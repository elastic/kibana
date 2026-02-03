/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ALERT_ACTIONS_DATA_STREAM } from '../../../resources/alert_actions';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/alert_events';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import {
  StorageService,
  type StorageServiceContract,
} from '../../services/storage_service/storage_service';
import { DispatcherService, type DispatcherServiceContract } from '../dispatcher';
import { setupTestServers } from './setup_test_servers';

/**
 * Test dataset representing alert events for a single rule with multiple episodes:
 *
 * Episode 1: active -> inactive
 * Episode 2: active -> inactive
 * Episode 3: active
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
    '@timestamp': '2026-01-22T07:25:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-2',
    status: 'recovered',
    episode_status: 'inactive',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:20:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-2',
    status: 'breached',
    episode_status: 'active',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:15:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-1',
    status: 'recovered',
    episode_status: 'inactive',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:10:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1' },
    group_hash: 'rule-1-series-1',
    episode_id: 'rule-1-series-1-episode-1',
    status: 'breached',
    episode_status: 'active',
    source: 'internal',
  },
];

describe('DispatcherService integration tests', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let esClient: ElasticsearchClient;
  let dispatcherService: DispatcherServiceContract;
  let storageService: StorageServiceContract;
  let mockLoggerService: LoggerServiceContract;

  beforeAll(async () => {
    const servers = await setupTestServers();
    esServer = servers.esServer;
    kibanaServer = servers.kibanaServer;
    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    await new Promise((res) => setTimeout(res, 5000));
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
    await cleanupDataStreams(esClient);

    mockLoggerService = createLoggerService().loggerService;

    storageService = new StorageService(esClient, mockLoggerService);
    dispatcherService = new DispatcherService(esClient, mockLoggerService, storageService);
  });

  describe('when there are no alert events', () => {
    it('should not dispatch any episodes', async () => {
      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      expect(result.startedAt).toBeDefined();

      const actionsResponse = await esClient.search({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: { match_all: {} },
      });

      expect(actionsResponse.hits.hits).toHaveLength(0);
    });
  });

  describe('when there are alert events without prior fire-events', () => {
    it('should dispatch all unique episodes', async () => {
      await seedAlertEvents(esClient, ALERT_EVENTS_TEST_DATA);

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      expect(result.startedAt).toBeDefined();

      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });

      const actionsResponse = await esClient.search({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: { match_all: {} },
        size: 100,
      });

      const fireEvents = actionsResponse.hits.hits.map((hit) => hit._source as Record<string, any>);

      expect(fireEvents).toHaveLength(5);
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
      const timestamps = fireEvents.map((event) => event.last_series_event_timestamp).sort();
      expect(timestamps).toEqual([
        '2026-01-22T07:10:00.000Z', // Episode 1
        '2026-01-22T07:15:00.000Z', // Episode 1
        '2026-01-22T07:20:00.000Z', // Episode 2
        '2026-01-22T07:25:00.000Z', // Episode 2
        '2026-01-22T07:50:00.000Z', // Episode 3
      ]);
    });
  });

  describe('when some episodes already have fire-events', () => {
    it('should only dispatch the new events', async () => {
      await seedAlertEvents(esClient, ALERT_EVENTS_TEST_DATA);

      await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      await seedAlertEvents(esClient, [
        {
          '@timestamp': '2026-01-22T07:55:00.000Z',
          type: 'alert',
          rule: { id: 'rule-1' },
          group_hash: 'rule-1-series-1',
          episode_id: 'rule-1-series-1-episode-3',
          status: 'recovered',
          episode_status: 'inactive',
          source: 'internal',
        },
      ]);

      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });

      await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      const actionsResponse = await esClient.search({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: {
          bool: {
            must: [
              { term: { action_type: 'fire-event' } },
              { range: { last_series_event_timestamp: { gte: '2026-01-22T07:55:00.000Z' } } },
            ],
          },
        },
        size: 100,
      });

      const newFireEvents = actionsResponse.hits.hits.map(
        (hit) => hit._source as Record<string, any>
      );

      expect(newFireEvents).toHaveLength(1);
      const timestamps = newFireEvents.map((event) => event.last_series_event_timestamp).sort();
      expect(timestamps).toEqual(['2026-01-22T07:55:00.000Z']);
    });
  });
});

async function cleanupDataStreams(esClient: ElasticsearchClient): Promise<void> {
  try {
    await esClient.deleteByQuery({
      index: ALERT_EVENTS_DATA_STREAM,
      query: { match_all: {} },
      refresh: true,
    });
  } catch (error) {
    // noop
  }

  try {
    await esClient.deleteByQuery({
      index: ALERT_ACTIONS_DATA_STREAM,
      query: { match_all: {} },
      refresh: true,
    });
  } catch (error) {
    // noop
  }
}

async function seedAlertEvents(
  esClient: ElasticsearchClient,
  events: Array<Record<string, any>>
): Promise<void> {
  const operations = events.flatMap((doc) => [
    { create: { _index: ALERT_EVENTS_DATA_STREAM } },
    doc,
  ]);

  await esClient.bulk({
    operations,
    refresh: 'wait_for',
  });
}

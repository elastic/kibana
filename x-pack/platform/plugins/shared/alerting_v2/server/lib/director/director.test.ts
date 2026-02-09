/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { DirectorService } from './director';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createQueryService } from '../services/query_service/query_service.mock';
import { createTransitionStrategyFactory } from './strategies/strategy_resolver.mock';
import { alertEpisodeStatus } from '../../resources/alert_events';
import { createAlertEvent, createEsqlResponse } from '../rule_executor/test_utils';
import { createRuleResponse } from '../test_utils';
import type { LatestAlertEventState } from './queries';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

function createLatestAlertEventStateResponse(records: Array<LatestAlertEventState>) {
  return createEsqlResponse(
    [
      { name: 'last_status', type: 'keyword' },
      { name: 'last_episode_id', type: 'keyword' },
      { name: 'last_episode_status', type: 'keyword' },
      { name: 'last_episode_status_count', type: 'long' },
      { name: 'last_episode_timestamp', type: 'date' },
      { name: 'group_hash', type: 'keyword' },
    ],
    records.map((r) => [
      r.last_status,
      r.last_episode_id,
      r.last_episode_status,
      r.last_episode_status_count,
      r.last_episode_timestamp ?? null,
      r.group_hash,
    ])
  );
}

describe('DirectorService', () => {
  let directorService: DirectorService;
  let mockEsClient: DeeplyMockedApi<ElasticsearchClient>;

  beforeEach(() => {
    const strategyFactory = createTransitionStrategyFactory();
    const { queryService, mockEsClient: esClient } = createQueryService();
    const { loggerService } = createLoggerService();

    mockEsClient = esClient;
    directorService = new DirectorService(strategyFactory, queryService, loggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const rule = createRuleResponse();

  describe('run', () => {
    it('returns empty array when no alert events provided', async () => {
      const result = await directorService.run({
        rule,
        alertEvents: [],
      });

      expect(result).toEqual([]);
      expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    });

    it('sets alerts to pending if there is no previous alert event state', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        episode: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));

      const result = await directorService.run({
        rule,
        alertEvents: [alertEvent],
      });

      expect(result).toHaveLength(1);

      expect(result[0].episode).toEqual({
        id: 'mocked-uuid',
        status: alertEpisodeStatus.pending,
      });
    });

    it('sets alerts to pending if the previous alert event state has no episode status', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        episode: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'episode-1',
            last_episode_status: null,
            last_episode_status_count: null,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        rule,
        alertEvents: [alertEvent],
      });

      expect(result).toHaveLength(1);

      expect(result[0].episode).toEqual({
        id: 'mocked-uuid',
        status: alertEpisodeStatus.pending,
      });
    });

    it('transitions from inactive to pending', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        episode: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'existing-episode-1',
            last_episode_status: 'inactive',
            last_episode_status_count: null,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        rule,
        alertEvents: [alertEvent],
      });

      expect(result[0].episode).toEqual({
        id: 'mocked-uuid',
        status: alertEpisodeStatus.pending,
      });
    });

    it('transitions from pending to active', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        episode: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'existing-episode',
            last_episode_status: 'pending',
            last_episode_status_count: null,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        rule,
        alertEvents: [alertEvent],
      });

      expect(result[0].episode).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.active,
      });
    });

    it('transitions from active to recovering ', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'recovered',
        episode: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'existing-episode',
            last_episode_status: 'active',
            last_episode_status_count: null,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        rule,
        alertEvents: [alertEvent],
      });

      expect(result[0].episode).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.recovering,
      });
    });

    it('transitions from recovering to inactive', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'recovered',
        episode: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'recovered',
            last_episode_id: 'existing-episode',
            last_episode_status: 'recovering',
            last_episode_status_count: null,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        rule,
        alertEvents: [alertEvent],
      });

      expect(result[0].episode).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.inactive,
      });
    });

    it('processes multiple alert events correctly', async () => {
      const alertEvents = [
        createAlertEvent({ group_hash: 'hash-1', status: 'breached', episode: undefined }),
        createAlertEvent({ group_hash: 'hash-2', status: 'recovered', episode: undefined }),
      ];

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'episode-1',
            last_episode_status: 'active',
            last_episode_status_count: null,
            group_hash: 'hash-1',
          },
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'episode-2',
            last_episode_status: 'active',
            last_episode_status_count: null,
            group_hash: 'hash-2',
          },
        ])
      );

      const result = await directorService.run({
        rule,
        alertEvents,
      });

      expect(result).toHaveLength(2);

      expect(result[0].episode).toEqual({
        id: 'episode-1',
        status: alertEpisodeStatus.active,
      });

      expect(result[1].episode).toEqual({
        id: 'episode-2',
        status: alertEpisodeStatus.recovering,
      });
    });

    it('generates new episode ID when transitioning from inactive', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        episode: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'recovered',
            last_episode_id: 'old-episode',
            last_episode_status: 'inactive',
            last_episode_status_count: null,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        rule,
        alertEvents: [alertEvent],
      });

      // Should generate new UUID, not use old episode
      expect(result[0].episode?.id).toBe('mocked-uuid');
    });

    it('preserves episode ID when not transitioning from inactive', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        episode: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'existing-episode',
            last_episode_status: alertEpisodeStatus.active,
            last_episode_status_count: null,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        rule,
        alertEvents: [alertEvent],
      });

      expect(result[0].episode?.id).toBe('existing-episode');
    });

    it('propagates query service errors', async () => {
      const alertEvent = createAlertEvent();
      mockEsClient.esql.query.mockRejectedValue(new Error('Query failed'));

      await expect(
        directorService.run({
          rule,
          alertEvents: [alertEvent],
        })
      ).rejects.toThrow('Query failed');
    });

    it('includes status_count in episode when strategy returns one', async () => {
      const ruleWithTransition = createRuleResponse({
        stateTransition: { pendingCount: 3 },
      });

      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        episode: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'episode-1',
            last_episode_status: 'pending',
            last_episode_status_count: 1,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        rule: ruleWithTransition,
        alertEvents: [alertEvent],
      });

      // 1 + 1 = 2, still below threshold of 3
      expect(result[0].episode).toEqual({
        id: 'episode-1',
        status: alertEpisodeStatus.pending,
        status_count: 2,
      });
    });

    it('transitions to active when count threshold is met', async () => {
      const ruleWithTransition = createRuleResponse({
        stateTransition: { pendingCount: 3 },
      });

      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        episode: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'episode-1',
            last_episode_status: 'pending',
            last_episode_status_count: 2,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        rule: ruleWithTransition,
        alertEvents: [alertEvent],
      });

      // 2 + 1 = 3, meets threshold of 3
      expect(result[0].episode).toEqual({
        id: 'episode-1',
        status: alertEpisodeStatus.active,
      });
    });
  });
});

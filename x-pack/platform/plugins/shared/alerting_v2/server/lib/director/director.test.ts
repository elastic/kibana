/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { DirectorService } from './director';
import { TransitionStrategyResolver } from './strategies/strategy_resolver';
import { BasicTransitionStrategy } from './strategies/basic_strategy';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createQueryService } from '../services/query_service/query_service.mock';
import { alertEpisodeStatus } from '../../resources/alert_events';
import { createAlertEvent, createEsqlResponse } from '../rule_executor/test_utils';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

function createLatestStateResponse(
  records: Array<{
    last_status: string;
    last_episode_id: string | null;
    last_episode_status: string | null;
    group_hash: string;
  }>
) {
  return createEsqlResponse(
    [
      { name: 'last_status', type: 'keyword' },
      { name: 'last_episode_id', type: 'keyword' },
      { name: 'last_episode_status', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
    ],
    records.map((r) => [r.last_status, r.last_episode_id, r.last_episode_status, r.group_hash])
  );
}

describe('DirectorService', () => {
  let directorService: DirectorService;
  let mockEsClient: DeeplyMockedApi<ElasticsearchClient>;

  beforeEach(() => {
    const basicStrategy = new BasicTransitionStrategy();
    const strategyResolver = new TransitionStrategyResolver(basicStrategy);
    const { queryService, mockEsClient: esClient } = createQueryService();
    const { loggerService } = createLoggerService();

    mockEsClient = esClient;
    directorService = new DirectorService(strategyResolver, queryService, loggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('returns empty array when no alert events provided', async () => {
      const result = await directorService.run({
        ruleId: 'rule-1',
        alertEvents: [],
      });

      expect(result).toEqual([]);
      expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    });

    it('enriches alert events with episode data for new alerts', async () => {
      const alertEvent = createAlertEvent({ group_hash: 'hash-1', status: 'breached' });

      mockEsClient.esql.query.mockResolvedValue(createLatestStateResponse([]));

      const result = await directorService.run({
        ruleId: 'rule-1',
        alertEvents: [alertEvent],
      });

      expect(result).toHaveLength(1);
      expect(result[0].episode).toEqual({
        id: 'mocked-uuid',
        status: alertEpisodeStatus.pending,
      });
    });

    it('transitions from inactive to pending on first breach', async () => {
      const alertEvent = createAlertEvent({ group_hash: 'hash-1', status: 'breached' });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestStateResponse([
          {
            last_status: 'recovered',
            last_episode_id: 'old-episode',
            last_episode_status: 'inactive',
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        ruleId: 'rule-1',
        alertEvents: [alertEvent],
      });

      expect(result[0].episode).toEqual({
        id: 'mocked-uuid',
        status: alertEpisodeStatus.pending,
      });
    });

    it('transitions from pending to active on continued breach', async () => {
      const alertEvent = createAlertEvent({ group_hash: 'hash-1', status: 'breached' });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestStateResponse([
          {
            last_status: 'breached',
            last_episode_id: 'existing-episode',
            last_episode_status: 'pending',
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        ruleId: 'rule-1',
        alertEvents: [alertEvent],
      });

      expect(result[0].episode).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.active,
      });
    });

    it('transitions from active to recovering on recovery', async () => {
      const alertEvent = createAlertEvent({ group_hash: 'hash-1', status: 'recovered' });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestStateResponse([
          {
            last_status: 'breached',
            last_episode_id: 'existing-episode',
            last_episode_status: 'active',
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        ruleId: 'rule-1',
        alertEvents: [alertEvent],
      });

      expect(result[0].episode).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.recovering,
      });
    });

    it('transitions from recovering to inactive on continued recovery', async () => {
      const alertEvent = createAlertEvent({ group_hash: 'hash-1', status: 'recovered' });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestStateResponse([
          {
            last_status: 'recovered',
            last_episode_id: 'existing-episode',
            last_episode_status: 'recovering',
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        ruleId: 'rule-1',
        alertEvents: [alertEvent],
      });

      expect(result[0].episode).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.inactive,
      });
    });

    it('processes multiple alert events correctly', async () => {
      const alertEvents = [
        createAlertEvent({ group_hash: 'hash-1', status: 'breached' }),
        createAlertEvent({ group_hash: 'hash-2', status: 'recovered' }),
      ];

      mockEsClient.esql.query.mockResolvedValue(
        createLatestStateResponse([
          {
            last_status: 'breached',
            last_episode_id: 'episode-1',
            last_episode_status: 'active',
            group_hash: 'hash-1',
          },
          {
            last_status: 'breached',
            last_episode_id: 'episode-2',
            last_episode_status: 'active',
            group_hash: 'hash-2',
          },
        ])
      );

      const result = await directorService.run({
        ruleId: 'rule-1',
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
      const alertEvent = createAlertEvent({ group_hash: 'hash-1', status: 'breached' });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestStateResponse([
          {
            last_status: 'recovered',
            last_episode_id: 'old-episode',
            last_episode_status: 'inactive',
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        ruleId: 'rule-1',
        alertEvents: [alertEvent],
      });

      // Should generate new UUID, not use old episode
      expect(result[0].episode?.id).toBe('mocked-uuid');
    });

    it('preserves episode ID when not transitioning from inactive', async () => {
      const alertEvent = createAlertEvent({ group_hash: 'hash-1', status: 'breached' });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestStateResponse([
          {
            last_status: 'breached',
            last_episode_id: 'existing-episode',
            last_episode_status: 'pending',
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        ruleId: 'rule-1',
        alertEvents: [alertEvent],
      });

      expect(result[0].episode?.id).toBe('existing-episode');
    });

    it('propagates query service errors', async () => {
      const alertEvent = createAlertEvent();
      mockEsClient.esql.query.mockRejectedValue(new Error('Query failed'));

      await expect(
        directorService.run({
          ruleId: 'rule-1',
          alertEvents: [alertEvent],
        })
      ).rejects.toThrow('Query failed');
    });
  });
});

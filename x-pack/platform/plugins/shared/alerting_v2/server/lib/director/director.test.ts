/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import { v4 as uuidV4 } from 'uuid';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { DirectorService } from './director';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import { createQueryService } from '../services/query_service/query_service.mock';
import { createTransitionStrategyFactory } from './strategies/strategy_resolver.mock';
import { alertEpisodeStatus } from '../../resources/datastreams/alert_events';
import { createAlertEvent, createEsqlResponse } from '../rule_executor/test_utils';
import { createRuleResponse } from '../test_utils';
import type { LatestAlertEventState } from './queries';
import { createExecutionContext } from '../execution_context';
import { v5 as uuidV5 } from 'uuid';

const testExecutionContext = createExecutionContext(new AbortController().signal);

// New episode ids now come from uuid v5. The default implementation returns a
// constant so the precondition-matrix tests stay assertion-stable; the
// single-series suite below swaps in an input-sensitive implementation to prove
// determinism, then restores this default.
const MOCKED_UUID = 'mocked-uuid';
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
  v5: jest.fn(() => 'mocked-uuid'),
}));

// The real `v5` has buffer-writing overloads that don't match a plain
// string-returning jest.fn, so reach the mock through a narrowed handle.
const uuidV5Mock = uuidV5 as unknown as jest.Mock<string, [string]>;

// The existing precondition-matrix tests default `last_lifecycle_action_type`
// to `null` — no user has issued activate/deactivate on the group. Tests that
// exercise the user-lock path override this explicitly.
type LatestAlertEventStateInput = Omit<LatestAlertEventState, 'last_lifecycle_action_type'> &
  Partial<Pick<LatestAlertEventState, 'last_lifecycle_action_type'>>;

function createLatestAlertEventStateResponse(records: Array<LatestAlertEventStateInput>) {
  return createEsqlResponse(
    [
      { name: 'last_status', type: 'keyword' },
      { name: 'last_episode_id', type: 'keyword' },
      { name: 'last_episode_status', type: 'keyword' },
      { name: 'last_episode_status_count', type: 'long' },
      { name: 'last_episode_timestamp', type: 'date' },
      { name: 'last_lifecycle_action_type', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
    ],
    records.map((r) => [
      r.last_status,
      r.last_episode_id,
      r.last_episode_status,
      r.last_episode_status_count,
      r.last_episode_timestamp ?? null,
      r.last_lifecycle_action_type ?? null,
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
    it('returns empty array and zero stats when no alert events provided', async () => {
      const result = await directorService.run({
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [],
      });

      expect(result).toEqual({ alertEvents: [], stats: { newEpisodeIds: [] } });
      expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    });

    it('preserves the incoming alert event type — it never rewrites `type`', async () => {
      // The director's SRP is episode tracking. `type` is stamped at creation
      // time by CreateAlertEventsStep from `rule.kind`, so the director must
      // leave it untouched. This test pins that invariant.
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        type: 'alert',
        alert: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));

      const result = await directorService.run({
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].type).toBe('alert');
    });

    it('sets alerts to pending if there is no previous alert event state', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        alert: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));

      const result = await directorService.run({
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents).toHaveLength(1);
      expect(result.alertEvents[0].alert).toEqual({
        id: 'mocked-uuid',
        status: alertEpisodeStatus.pending,
      });
      expect(result.stats.newEpisodeIds).toHaveLength(1);
    });

    it('sets alerts to pending if the previous alert event state has no episode status', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        alert: undefined,
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
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents).toHaveLength(1);
      expect(result.alertEvents[0].alert).toEqual({
        id: 'mocked-uuid',
        status: alertEpisodeStatus.pending,
      });
      expect(result.stats.newEpisodeIds).toHaveLength(1);
    });

    it('transitions from inactive to pending', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        alert: undefined,
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
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].alert).toEqual({
        id: 'mocked-uuid',
        status: alertEpisodeStatus.pending,
      });
      expect(result.stats.newEpisodeIds).toHaveLength(1);
    });

    it('transitions from pending to active', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        alert: undefined,
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
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].alert).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.active,
      });
      expect(result.stats.newEpisodeIds).toHaveLength(0);
    });

    it('transitions from active to recovering ', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'recovered',
        alert: undefined,
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
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].alert).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.recovering,
      });
      expect(result.stats.newEpisodeIds).toHaveLength(0);
    });

    it('transitions from recovering to inactive', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'recovered',
        alert: undefined,
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
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].alert).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.inactive,
      });
      expect(result.stats.newEpisodeIds).toHaveLength(0);
    });

    it("sets the episode status to active on a no_data event when no_data.strategy is 'alert'", async () => {
      const ruleWithEmit = createRuleResponse({ no_data: { strategy: 'alert' } });
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'no_data',
        alert: undefined,
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
        spaceId: 'default',
        rule: ruleWithEmit,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].alert).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.active,
      });
    });

    it("preserves the prior episode status on a no_data event when no_data.strategy is 'keep_last'", async () => {
      const ruleWithLastKnown = createRuleResponse({ no_data: { strategy: 'keep_last' } });
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'no_data',
        alert: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'existing-episode',
            last_episode_status: alertEpisodeStatus.recovering,
            last_episode_status_count: null,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        spaceId: 'default',
        rule: ruleWithLastKnown,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].alert).toEqual({
        id: 'existing-episode',
        status: alertEpisodeStatus.recovering,
      });
    });

    it('processes multiple alert events correctly', async () => {
      const alertEvents = [
        createAlertEvent({ group_hash: 'hash-1', status: 'breached', alert: undefined }),
        createAlertEvent({ group_hash: 'hash-2', status: 'recovered', alert: undefined }),
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
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents,
      });

      expect(result.alertEvents).toHaveLength(2);
      expect(result.alertEvents[0].alert).toEqual({
        id: 'episode-1',
        status: alertEpisodeStatus.active,
      });
      expect(result.alertEvents[1].alert).toEqual({
        id: 'episode-2',
        status: alertEpisodeStatus.recovering,
      });
      expect(result.stats.newEpisodeIds).toHaveLength(0);
    });

    it('generates new episode ID when transitioning from inactive', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        alert: undefined,
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
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].alert?.id).toBe('mocked-uuid');
      expect(result.stats.newEpisodeIds).toHaveLength(1);
    });

    it('preserves episode ID when not transitioning from inactive', async () => {
      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        alert: undefined,
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
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].alert?.id).toBe('existing-episode');
      expect(result.stats.newEpisodeIds).toHaveLength(0);
    });

    it('throws when execution context is already aborted before processing', async () => {
      const abortController = new AbortController();
      abortController.abort();
      const abortedContext = createExecutionContext(abortController.signal);

      const alertEvent = createAlertEvent();

      await expect(
        directorService.run({
          spaceId: 'default',
          rule,
          executionContext: abortedContext,
          alertEvents: [alertEvent],
        })
      ).rejects.toThrow(/aborted/i);

      expect(mockEsClient.esql.query).not.toHaveBeenCalled();
    });

    it('propagates query service errors', async () => {
      const alertEvent = createAlertEvent();
      mockEsClient.esql.query.mockRejectedValue(new Error('Query failed'));

      await expect(
        directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [alertEvent],
        })
      ).rejects.toThrow('Query failed');
    });

    it('includes status_count in episode when strategy returns one', async () => {
      const ruleWithTransition = createRuleResponse({
        state_transition: { pending: { count: 3 } },
      });

      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        alert: undefined,
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
        spaceId: 'default',
        rule: ruleWithTransition,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].alert).toEqual({
        id: 'episode-1',
        status: alertEpisodeStatus.pending,
        status_count: 2,
      });
    });

    it('transitions to active when count threshold is met', async () => {
      const ruleWithTransition = createRuleResponse({
        state_transition: { pending: { count: 3 } },
      });

      const alertEvent = createAlertEvent({
        group_hash: 'hash-1',
        status: 'breached',
        alert: undefined,
      });

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'episode-1',
            last_episode_status: 'pending',
            last_episode_status_count: 3,
            group_hash: 'hash-1',
          },
        ])
      );

      const result = await directorService.run({
        spaceId: 'default',
        rule: ruleWithTransition,
        executionContext: testExecutionContext,
        alertEvents: [alertEvent],
      });

      expect(result.alertEvents[0].alert).toEqual({
        id: 'episode-1',
        status: alertEpisodeStatus.active,
      });
    });

    it('evaluates timeframe thresholds against the director clock, not the event', async () => {
      // Incoming events carry no `@timestamp` (ES sets it at ingest), so the
      // elapsed time must come from the director run time.
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:10:00.000Z'));

      try {
        const ruleWithTransition = createRuleResponse({
          state_transition: { pending: { timeframe: '5m' } },
        });

        const { '@timestamp': ignoredTimestamp, ...alertEvent } = createAlertEvent({
          group_hash: 'hash-1',
          status: 'breached',
          alert: undefined,
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
          spaceId: 'default',
          rule: ruleWithTransition,
          executionContext: testExecutionContext,
          alertEvents: [alertEvent],
        });

        expect(result.alertEvents[0].alert).toEqual({
          id: 'episode-1',
          status: alertEpisodeStatus.active,
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('aggregates newEpisodeCount only for fresh episodes across a mixed batch', async () => {
      const alertEvents = [
        createAlertEvent({ group_hash: 'hash-new', status: 'breached', alert: undefined }),
        createAlertEvent({ group_hash: 'hash-existing', status: 'breached', alert: undefined }),
        createAlertEvent({ group_hash: 'hash-inactive', status: 'breached', alert: undefined }),
      ];

      mockEsClient.esql.query.mockResolvedValue(
        createLatestAlertEventStateResponse([
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'breached',
            last_episode_id: 'existing-episode',
            last_episode_status: 'active',
            last_episode_status_count: null,
            group_hash: 'hash-existing',
          },
          {
            last_episode_timestamp: '2026-01-01T00:00:00.000Z',
            last_status: 'recovered',
            last_episode_id: 'old-episode',
            last_episode_status: 'inactive',
            last_episode_status_count: null,
            group_hash: 'hash-inactive',
          },
        ])
      );

      const result = await directorService.run({
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents,
      });

      expect(result.alertEvents).toHaveLength(3);
      expect(result.stats.newEpisodeIds).toHaveLength(2);
    });

    it('attaches every row of a group in one batch to a single new episode', async () => {
      (uuidV4 as jest.Mock).mockReturnValueOnce('episode-1').mockReturnValueOnce('episode-2');

      mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));

      const result = await directorService.run({
        spaceId: 'default',
        rule,
        executionContext: testExecutionContext,
        alertEvents: [
          createAlertEvent({ group_hash: 'hash-1', status: 'breached', alert: undefined }),
          createAlertEvent({ group_hash: 'hash-1', status: 'breached', alert: undefined }),
          createAlertEvent({ group_hash: 'hash-2', status: 'breached', alert: undefined }),
        ],
      });

      expect(result.alertEvents.map((e) => e.alert)).toEqual([
        { id: 'episode-1', status: alertEpisodeStatus.pending },
        { id: 'episode-1', status: alertEpisodeStatus.pending },
        { id: 'episode-2', status: alertEpisodeStatus.pending },
      ]);
      expect(result.stats.newEpisodeIds).toEqual(['episode-1', 'episode-2']);
    });

    describe('multiple rows for the same group in one batch', () => {
      const rowsFor = (groupHash: string, count: number) =>
        Array.from({ length: count }, () =>
          createAlertEvent({ group_hash: groupHash, status: 'breached', alert: undefined })
        );

      it('reuses the open episode for every row and reports no new episodes', async () => {
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
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: rowsFor('hash-1', 3),
        });

        expect(result.alertEvents.map((e) => e.alert?.id)).toEqual([
          'existing-episode',
          'existing-episode',
          'existing-episode',
        ]);
        expect(result.stats.newEpisodeIds).toEqual([]);
      });

      it('opens a single new episode when the previous one is inactive', async () => {
        (uuidV4 as jest.Mock).mockReturnValueOnce('episode-1').mockReturnValueOnce('episode-2');

        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'recovered',
              last_episode_id: 'old-episode',
              last_episode_status: alertEpisodeStatus.inactive,
              last_episode_status_count: null,
              group_hash: 'hash-1',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: rowsFor('hash-1', 2),
        });

        expect(result.alertEvents.map((e) => e.alert?.id)).toEqual(['episode-1', 'episode-1']);
        expect(result.stats.newEpisodeIds).toEqual(['episode-1']);
      });

      it('does not count extra rows as consecutive breaches toward the pending threshold', async () => {
        const ruleWithTransition = createRuleResponse({
          state_transition: { pending: { count: 3 } },
        });

        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'breached',
              last_episode_id: 'episode-1',
              last_episode_status: alertEpisodeStatus.pending,
              last_episode_status_count: 1,
              group_hash: 'hash-1',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule: ruleWithTransition,
          executionContext: testExecutionContext,
          alertEvents: rowsFor('hash-1', 2),
        });

        const expectedAlert = {
          id: 'episode-1',
          status: alertEpisodeStatus.pending,
          status_count: 2,
        };
        expect(result.alertEvents.map((e) => e.alert)).toEqual([expectedAlert, expectedAlert]);
      });

      it('gives each row its own copy of the shared episode', async () => {
        mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: rowsFor('hash-1', 2),
        });

        expect(result.alertEvents[0].alert).toEqual(result.alertEvents[1].alert);
        expect(result.alertEvents[0].alert).not.toBe(result.alertEvents[1].alert);
      });

      it('keeps interleaved groups on their own episodes', async () => {
        (uuidV4 as jest.Mock).mockReturnValueOnce('episode-a').mockReturnValueOnce('episode-b');

        mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [
            ...rowsFor('hash-a', 1),
            ...rowsFor('hash-b', 1),
            ...rowsFor('hash-a', 1),
            ...rowsFor('hash-b', 1),
          ],
        });

        expect(result.alertEvents.map((e) => e.alert?.id)).toEqual([
          'episode-a',
          'episode-b',
          'episode-a',
          'episode-b',
        ]);
        expect(result.stats.newEpisodeIds).toEqual(['episode-a', 'episode-b']);
      });

      it('keeps a group on one episode across batches of the same execution', async () => {
        (uuidV4 as jest.Mock).mockReturnValueOnce('episode-1').mockReturnValueOnce('episode-2');

        // `.rule-events` writes are not refreshed, so the second batch still sees no state.
        mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));
        const executionContext = createExecutionContext(new AbortController().signal);

        const first = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext,
          alertEvents: rowsFor('hash-1', 1),
        });
        const second = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext,
          alertEvents: [...rowsFor('hash-1', 1), ...rowsFor('hash-2', 1)],
        });

        expect(first.alertEvents[0].alert?.id).toBe('episode-1');
        expect(second.alertEvents.map((e) => e.alert?.id)).toEqual(['episode-1', 'episode-2']);
        expect(first.stats.newEpisodeIds).toEqual(['episode-1']);
        expect(second.stats.newEpisodeIds).toEqual(['episode-2']);
      });

      it('skips the state query when every group was already decided in the execution', async () => {
        mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));
        const executionContext = createExecutionContext(new AbortController().signal);

        await directorService.run({
          spaceId: 'default',
          rule,
          executionContext,
          alertEvents: rowsFor('hash-1', 1),
        });
        mockEsClient.esql.query.mockClear();

        const second = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext,
          alertEvents: rowsFor('hash-1', 2),
        });

        expect(mockEsClient.esql.query).not.toHaveBeenCalled();
        expect(second.alertEvents).toHaveLength(2);
        expect(second.stats.newEpisodeIds).toEqual([]);
      });

      it('does not share decisions between executions', async () => {
        (uuidV4 as jest.Mock).mockReturnValueOnce('episode-1').mockReturnValueOnce('episode-2');
        mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));

        const run = () =>
          directorService.run({
            spaceId: 'default',
            rule,
            executionContext: createExecutionContext(new AbortController().signal),
            alertEvents: rowsFor('hash-1', 1),
          });

        const first = await run();
        const second = await run();

        expect(first.alertEvents[0].alert?.id).toBe('episode-1');
        expect(second.alertEvents[0].alert?.id).toBe('episode-2');
      });

      it('keeps every row of a user-locked group on the locked episode, forced active', async () => {
        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'breached',
              last_episode_id: 'locked-episode',
              last_episode_status: alertEpisodeStatus.recovering,
              last_episode_status_count: null,
              last_lifecycle_action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
              group_hash: 'hash-1',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: rowsFor('hash-1', 2),
        });

        expect(result.alertEvents.map((e) => e.alert)).toEqual([
          { id: 'locked-episode', status: alertEpisodeStatus.active },
          { id: 'locked-episode', status: alertEpisodeStatus.active },
        ]);
        expect(result.stats.newEpisodeIds).toEqual([]);
      });
    });

    // A group is "user-locked" when its most recent lifecycle action in
    // `.alert-actions` is `activate`. In that state the director must hold
    // the episode in `active` regardless of what the strategy computes,
    // until the user issues a `deactivate` (which flips
    // `last_lifecycle_action_type` back to `deactivate` and lets the
    // strategy own transitions again). See DirectorService.isUserLocked.
    describe('user lock (last_lifecycle_action_type === activate)', () => {
      it('forces episode.status to active on a recovery event, preserving the raw event status', async () => {
        // The engine emitted a recovery for a user-activated episode.
        // The director must NOT flip the episode to `recovering`. The
        // user has taken ownership.
        const alertEvent = createAlertEvent({
          group_hash: 'hash-1',
          status: 'recovered',
          alert: undefined,
        });

        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'breached',
              last_episode_id: 'user-activated-episode',
              last_episode_status: 'active',
              last_episode_status_count: null,
              last_lifecycle_action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
              group_hash: 'hash-1',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [alertEvent],
        });

        expect(result.alertEvents).toHaveLength(1);
        expect(result.alertEvents[0].status).toBe('recovered');
        expect(result.alertEvents[0].alert).toEqual({
          id: 'user-activated-episode',
          status: alertEpisodeStatus.active,
        });
      });

      it('forces episode.status to active on a breach event (no double-flip)', async () => {
        // A subsequent breach on a user-activated episode is a no-op at
        // the episode level. We're already active. Same forced-active
        // emit. The raw event status is preserved as-is.
        const alertEvent = createAlertEvent({
          group_hash: 'hash-1',
          status: 'breached',
          alert: undefined,
        });

        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'breached',
              last_episode_id: 'user-activated-episode',
              last_episode_status: 'active',
              last_episode_status_count: null,
              last_lifecycle_action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
              group_hash: 'hash-1',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [alertEvent],
        });

        expect(result.alertEvents[0].status).toBe('breached');
        expect(result.alertEvents[0].alert).toEqual({
          id: 'user-activated-episode',
          status: alertEpisodeStatus.active,
        });
      });

      it('never emits status_count on the forced-active event (mirrors any → active transitions)', async () => {
        // Even under a count-based rule where the previous state carries
        // status_count, the forced-active emit drops it — consistent with
        // BasicTransitionStrategy and CountTimeframeStrategy which never
        // emit status_count on the → active edge.
        const ruleWithTransition = createRuleResponse({
          state_transition: { pending: { count: 3 } },
        });

        const alertEvent = createAlertEvent({
          group_hash: 'hash-1',
          status: 'recovered',
          alert: undefined,
        });

        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'breached',
              last_episode_id: 'user-activated-episode',
              last_episode_status: 'active',
              last_episode_status_count: 5,
              last_lifecycle_action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
              group_hash: 'hash-1',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule: ruleWithTransition,
          executionContext: testExecutionContext,
          alertEvents: [alertEvent],
        });

        expect(result.alertEvents[0].alert).toEqual({
          id: 'user-activated-episode',
          status: alertEpisodeStatus.active,
        });
        expect(result.alertEvents[0].alert?.status_count).toBeUndefined();
      });

      it('does not lock when the last lifecycle action is deactivate — strategy owns transitions', async () => {
        // Deactivate releases the lock: the director falls back to the
        // strategy for subsequent ticks. A rebreach on a
        // just-user-deactivated group should follow the normal
        // inactive → new-episode path (see resolveEpisodeId), NOT the
        // forced-active path.
        const alertEvent = createAlertEvent({
          group_hash: 'hash-1',
          status: 'breached',
          alert: undefined,
        });

        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'recovered',
              last_episode_id: 'user-deactivated-episode',
              last_episode_status: 'inactive',
              last_episode_status_count: null,
              last_lifecycle_action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
              group_hash: 'hash-1',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [alertEvent],
        });

        expect(result.alertEvents[0].alert).toEqual({
          id: 'mocked-uuid',
          status: alertEpisodeStatus.pending,
        });
      });

      it('does not lock when no lifecycle action has ever been issued (last_lifecycle_action_type is null)', async () => {
        // The default state for any group that has never received an
        // activate/deactivate audit doc. Belt-and-braces coverage for the
        // `null` branch of isUserLocked.
        const alertEvent = createAlertEvent({
          group_hash: 'hash-1',
          status: 'recovered',
          alert: undefined,
        });

        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'breached',
              last_episode_id: 'engine-episode',
              last_episode_status: 'active',
              last_episode_status_count: null,
              last_lifecycle_action_type: null,
              group_hash: 'hash-1',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [alertEvent],
        });

        expect(result.alertEvents[0].alert).toEqual({
          id: 'engine-episode',
          status: alertEpisodeStatus.recovering,
        });
      });

      it('falls back to the strategy when last_lifecycle_action_type is activate but the rule-events stream has no episode id (defensive)', async () => {
        // Guards the pruned-rule-events edge: if the audit stream still
        // holds an activate but the rule-events stream has no state to
        // pin the forced emit to, we cannot lock — fall through to the
        // strategy, which will spawn a fresh episode on the next breach.
        const alertEvent = createAlertEvent({
          group_hash: 'hash-1',
          status: 'breached',
          alert: undefined,
        });

        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: null,
              last_status: 'no_data',
              last_episode_id: null,
              last_episode_status: null,
              last_episode_status_count: null,
              last_lifecycle_action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
              group_hash: 'hash-1',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [alertEvent],
        });

        expect(result.alertEvents[0].alert).toEqual({
          id: 'mocked-uuid',
          status: alertEpisodeStatus.pending,
        });
      });

      it('locks only the affected group in a mixed-group batch', async () => {
        // The lock is per-group_hash. Groups without an activate stay
        // under strategy control.
        const alertEvents = [
          createAlertEvent({ group_hash: 'locked-group', status: 'recovered', alert: undefined }),
          createAlertEvent({
            group_hash: 'engine-group',
            status: 'recovered',
            alert: undefined,
          }),
        ];

        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'breached',
              last_episode_id: 'locked-episode',
              last_episode_status: 'active',
              last_episode_status_count: null,
              last_lifecycle_action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
              group_hash: 'locked-group',
            },
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'breached',
              last_episode_id: 'engine-episode',
              last_episode_status: 'active',
              last_episode_status_count: null,
              last_lifecycle_action_type: null,
              group_hash: 'engine-group',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents,
        });

        expect(result.alertEvents[0].alert).toEqual({
          id: 'locked-episode',
          status: alertEpisodeStatus.active,
        });
        expect(result.alertEvents[1].alert).toEqual({
          id: 'engine-episode',
          status: alertEpisodeStatus.recovering,
        });
      });
    });

    describe('single-series (ungrouped) episodes', () => {
      // An ungrouped rule emits one rule event per returned row, all sharing one
      // group_hash within a run. New episode ids are deterministic (uuid v5)
      // seeded from `ruleId | group_hash | scheduled_timestamp`, so every one of
      // those rows must collapse to the same alert.id — within a batch, across
      // the batches of one run, yet rolling over on a later run.
      const UNGROUPED_HASH = 'ungrouped-series-hash';
      const RUN_TS = '2025-01-01T00:00:00.000Z';
      const seedId = (ts: string) => `episode:${rule.id}|${UNGROUPED_HASH}|${ts}`;

      beforeEach(() => {
        // Echo the seed so the test can assert the id is a function of the seed,
        // not a fresh value per call (which is the bug being fixed).
        uuidV5Mock.mockImplementation((name) => `episode:${name}`);
      });

      afterEach(() => {
        uuidV5Mock.mockImplementation(() => MOCKED_UUID);
      });

      const ungroupedRow = (data: Record<string, unknown>, scheduledTimestamp = RUN_TS) =>
        createAlertEvent({
          group_hash: UNGROUPED_HASH,
          scheduled_timestamp: scheduledTimestamp,
          status: 'breached',
          type: 'alert',
          alert: undefined,
          data,
        });

      it('assigns one shared episode id to every row of a newly opened series', async () => {
        mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [
            ungroupedRow({ 'host.name': 'host-a' }),
            ungroupedRow({ 'host.name': 'host-b' }),
            ungroupedRow({ 'host.name': 'host-c' }),
          ],
        });

        const ids = result.alertEvents.map((e) => e.alert?.id);
        // Every row shares one non-empty episode id derived from the run seed.
        expect(ids).toEqual([seedId(RUN_TS), seedId(RUN_TS), seedId(RUN_TS)]);
        // The run opened exactly one distinct episode, not one per row.
        expect(new Set(result.stats.newEpisodeIds).size).toBe(1);
      });

      it('reuses the same episode id across the streamed batches of one run', async () => {
        // The director runs once per streamed batch with freshly fetched prior
        // state (empty for a brand-new series, since within-run writes are not
        // yet visible). Deterministic ids keep the batches on one episode.
        mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));

        const batch1 = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [ungroupedRow({ 'host.name': 'host-a' })],
        });
        const batch2 = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [ungroupedRow({ 'host.name': 'host-b' })],
        });

        expect(batch1.alertEvents[0].alert?.id).toBe(seedId(RUN_TS));
        expect(batch2.alertEvents[0].alert?.id).toBe(seedId(RUN_TS));
      });

      it('mints a different episode id when a later run reopens the series', async () => {
        mockEsClient.esql.query.mockResolvedValue(createLatestAlertEventStateResponse([]));
        const laterTs = '2025-01-01T00:05:00.000Z';

        const firstRun = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [ungroupedRow({ 'host.name': 'host-a' }, RUN_TS)],
        });
        const laterRun = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [ungroupedRow({ 'host.name': 'host-a' }, laterTs)],
        });

        expect(firstRun.alertEvents[0].alert?.id).toBe(seedId(RUN_TS));
        expect(laterRun.alertEvents[0].alert?.id).toBe(seedId(laterTs));
        expect(laterRun.alertEvents[0].alert?.id).not.toBe(firstRun.alertEvents[0].alert?.id);
      });

      it('does not change grouped rules: one episode per group, existing episodes preserved', async () => {
        // Grouped rules emit one event per group per run. Each new group must
        // still open its own episode (distinct ids, derived from its own hash),
        // and a group with an open episode must keep that id rather than have
        // it re-derived.
        const groupedRow = (groupHash: string) =>
          createAlertEvent({
            group_hash: groupHash,
            scheduled_timestamp: RUN_TS,
            status: 'breached',
            type: 'alert',
            alert: undefined,
            data: { 'host.name': groupHash },
          });

        mockEsClient.esql.query.mockResolvedValue(
          createLatestAlertEventStateResponse([
            {
              last_episode_timestamp: '2026-01-01T00:00:00.000Z',
              last_status: 'breached',
              last_episode_id: 'existing-episode-c',
              last_episode_status: 'active',
              last_episode_status_count: null,
              group_hash: 'hash-c',
            },
          ])
        );

        const result = await directorService.run({
          spaceId: 'default',
          rule,
          executionContext: testExecutionContext,
          alertEvents: [groupedRow('hash-a'), groupedRow('hash-b'), groupedRow('hash-c')],
        });

        const [a, b, c] = result.alertEvents.map((event) => event.alert?.id);
        // New groups: one episode each, keyed by their own group hash.
        expect(a).toBe(`episode:${rule.id}|hash-a|${RUN_TS}`);
        expect(b).toBe(`episode:${rule.id}|hash-b|${RUN_TS}`);
        expect(a).not.toBe(b);
        // Existing active group: episode id preserved, not re-derived.
        expect(c).toBe('existing-episode-c');
        expect(new Set(result.stats.newEpisodeIds)).toEqual(new Set([a, b]));
      });
    });
  });
});

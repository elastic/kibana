/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import moment from 'moment';
import {
  ALERT_ACTIONS_DATA_STREAM,
  type AlertAction,
} from '../../resources/datastreams/alert_actions';
import type {
  ActionPolicySavedObjectAttributes,
  RuleSavedObjectAttributes,
} from '../../saved_objects';
import { createRuleSoAttributes } from '../test_utils';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import type { ActionPolicySavedObjectServiceContract } from '../services/action_policy_saved_object_service/action_policy_saved_object_service';
import { createActionPolicySavedObjectService } from '../services/action_policy_saved_object_service/action_policy_saved_object_service.mock';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { createQueryService } from '../services/query_service/query_service.mock';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import { createRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { createStorageService } from '../services/storage_service/storage_service.mock';
import {
  LOOKBACK_WINDOW_MINUTES,
  SETTLE_BUFFER_SECONDS,
  TICK_LOOKBACK_CAP_MINUTES,
} from './constants';
import { DispatcherService } from './dispatcher';
import { DispatcherPipeline, type DispatcherPipelineContract } from './execution_pipeline';
import {
  createAlertEpisodeSuppressionsResponse,
  createDispatchableAlertEventsResponse,
  createLastNotifiedTimestampsResponse,
} from './fixtures/dispatcher';
import { getDispatchableAlertEventsQuery } from './queries';
import {
  FetchEpisodesStep,
  FetchSuppressionsStep,
  ApplySuppressionStep,
  FetchRulesStep,
  ApplyMaintenanceWindowStep,
  FetchPoliciesStep,
  EvaluateMatchersStep,
  BuildGroupsStep,
  ApplyThrottlingStep,
  DispatchStep,
  StoreActionsStep,
} from './steps';
import { createMaintenanceWindowServiceMock } from '../services/maintenance_window_service/maintenance_window_service.mock';
import type { AlertEpisode, AlertEpisodeSuppression } from './types';

interface TimestampRange {
  gte?: string;
  gt?: string;
  lte?: string;
}

function extractTimestampRange(esqlRequest: unknown): TimestampRange {
  const filter = (esqlRequest as { filter: { range: Record<string, TimestampRange> } }).filter;
  return filter.range['@timestamp'];
}

function mockRulesFindByIds(
  spy: jest.SpyInstance,
  ruleIds: string[],
  overrides?: Partial<RuleSavedObjectAttributes>
) {
  spy.mockResolvedValue(
    ruleIds.map((id) => ({
      id,
      attributes: createRuleSoAttributes(overrides),
      namespaces: ['default'],
    }))
  );
}

function mockNpFindAllDecrypted(
  spy: jest.SpyInstance,
  policyIds: string[],
  overrides: Partial<ActionPolicySavedObjectAttributes> = {}
) {
  spy.mockResolvedValue(
    policyIds.map((id) => ({
      id,
      attributes: {
        name: `Policy ${id}`,
        description: `Description for ${id}`,
        enabled: true,
        destinations: [{ type: 'workflow', id: 'workflow-test-id' }],
        auth: { apiKey: 'test-api-key', owner: 'elastic', createdByUser: false },
        createdBy: null,
        updatedBy: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
      },
      namespaces: ['default'],
    }))
  );
}

const createMockWorkflowsManagement = (): jest.Mocked<WorkflowsServerPluginSetup['management']> =>
  ({
    getWorkflow: jest.fn().mockResolvedValue(null),
    runWorkflow: jest.fn().mockResolvedValue('exec-1'),
  } as unknown as jest.Mocked<WorkflowsServerPluginSetup['management']>);

function buildDispatcherService(deps: {
  queryService: QueryServiceContract;
  storageService: StorageServiceContract;
  rulesSoService: RulesSavedObjectServiceContract;
  npSoService: ActionPolicySavedObjectServiceContract;
  workflowsManagement: WorkflowsServerPluginSetup['management'];
}): { dispatcherService: DispatcherService; mockLogger: jest.Mocked<Logger> } {
  const { loggerService, mockLogger } = createLoggerService();
  const pipeline = new DispatcherPipeline(loggerService, [
    new FetchEpisodesStep(deps.queryService),
    new FetchSuppressionsStep(deps.queryService),
    new ApplySuppressionStep(),
    new FetchRulesStep(deps.rulesSoService),
    new ApplyMaintenanceWindowStep(createMaintenanceWindowServiceMock()),
    new FetchPoliciesStep(deps.npSoService),
    new EvaluateMatchersStep(loggerService),
    new BuildGroupsStep(),
    new ApplyThrottlingStep(deps.queryService, loggerService),
    new DispatchStep(loggerService, deps.workflowsManagement),
    new StoreActionsStep(deps.storageService),
  ]);
  const dispatcherService = new DispatcherService(pipeline, loggerService);
  return { dispatcherService, mockLogger };
}

describe('DispatcherService', () => {
  let dispatcherService: DispatcherService;
  let mockLogger: jest.Mocked<Logger>;
  let queryService: QueryServiceContract;
  let storageService: StorageServiceContract;
  let queryEsClient: DeeplyMockedApi<ElasticsearchClient>;
  let storageEsClient: jest.Mocked<ElasticsearchClient>;
  let rulesSoService: RulesSavedObjectServiceContract;
  let npSoService: ActionPolicySavedObjectServiceContract;
  let mockFindByIds: jest.SpyInstance;
  let mockFindAllDecrypted: jest.SpyInstance;
  let mockWfm: jest.Mocked<WorkflowsServerPluginSetup['management']>;

  beforeEach(() => {
    ({ queryService, mockEsClient: queryEsClient } = createQueryService());
    ({ storageService, mockEsClient: storageEsClient } = createStorageService());

    const rulesMock = createRulesSavedObjectService();
    rulesSoService = rulesMock.rulesSavedObjectService;
    mockFindByIds = rulesMock.mockFindByIds;
    mockRulesFindByIds(mockFindByIds, ['rule-1', 'rule-2']);

    const npMock = createActionPolicySavedObjectService();
    npSoService = npMock.actionPolicySavedObjectService;
    mockFindAllDecrypted = npMock.mockFindAllDecrypted;
    mockNpFindAllDecrypted(mockFindAllDecrypted, ['policy_456']);

    mockWfm = createMockWorkflowsManagement();

    ({ dispatcherService, mockLogger } = buildDispatcherService({
      queryService,
      storageService,
      rulesSoService,
      npSoService,
      workflowsManagement: mockWfm,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('run', () => {
    it('indexes fire actions for dispatchable alert episodes when no suppressions exist', async () => {
      const alertEpisodes: AlertEpisode[] = [
        {
          last_event_timestamp: '2026-01-22T07:10:00.000Z',
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-22T07:15:00.000Z',
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          episode_status: 'inactive',
        },
      ];

      const suppressions: AlertEpisodeSuppression[] = [
        {
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          should_suppress: false,
        },
        {
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          should_suppress: false,
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse(suppressions))
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }, { create: { _id: '2', status: 201 } }],
        errors: false,
      } as BulkResponse);

      const previousStartedAt = new Date('2026-01-22T07:30:00.000Z');
      const before = Date.now();

      const result = await dispatcherService.run({
        previousStartedAt,
      });

      expect(result.startedAt).toBeInstanceOf(Date);
      const after = Date.now();

      expect(queryEsClient.esql.query).toHaveBeenCalledTimes(3);
      const [firstCall] = queryEsClient.esql.query.mock.calls[0];
      expect(firstCall).toMatchObject({
        query: getDispatchableAlertEventsQuery().query,
        drop_null_columns: false,
        params: undefined,
      });
      // Cold start (no `eventWatermark`): the window is bounded by
      // `now − LOOKBACK_WINDOW_MINUTES` (gte) and capped by `now − SETTLE_BUFFER`,
      // truncated to `windowStart + TICK_LOOKBACK_CAP_MINUTES`.
      const range = extractTimestampRange(firstCall);
      expect(range).toHaveProperty('gte');
      expect(range).toHaveProperty('lte');
      expect(range).not.toHaveProperty('gt');
      const gte = new Date(range.gte as string).getTime();
      const lte = new Date(range.lte as string).getTime();
      const lookbackMs = LOOKBACK_WINDOW_MINUTES * 60_000;
      const capMs = TICK_LOOKBACK_CAP_MINUTES * 60_000;
      const settleMs = SETTLE_BUFFER_SECONDS * 1_000;
      expect(gte).toBeGreaterThanOrEqual(before - lookbackMs - 5);
      expect(gte).toBeLessThanOrEqual(after - lookbackMs + 5);
      expect(lte - gte).toBeLessThanOrEqual(capMs + 5);
      expect(lte).toBeLessThanOrEqual(after - settleMs + 5);

      expect(storageEsClient.bulk).toHaveBeenCalledWith({
        operations: expect.any(Array),
        refresh: false,
      });

      const [{ operations }] = storageEsClient.bulk.mock.calls[0];
      const safeOperations = operations ?? [];
      const createOperations = safeOperations.filter((_, index) => index % 2 === 0);
      const docs = safeOperations.filter((_, index) => index % 2 === 1);
      expect(createOperations).toEqual(
        expect.arrayContaining([{ create: { _index: ALERT_ACTIONS_DATA_STREAM } }])
      );

      const fireActions = docs.filter((d: any) => d.action_type === 'fire');
      const notifiedActions = docs.filter((d: any) => d.action_type === 'notified');
      expect(fireActions).toHaveLength(alertEpisodes.length);
      expect(notifiedActions).toHaveLength(alertEpisodes.length);

      expect(docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            group_hash: 'hash-1',
            last_series_event_timestamp: '2026-01-22T07:10:00.000Z',
            actor: 'system',
            action_type: 'fire',
            rule_id: 'rule-1',
            source: 'internal',
          }),
          expect.objectContaining({
            group_hash: 'hash-2',
            last_series_event_timestamp: '2026-01-22T07:15:00.000Z',
            actor: 'system',
            action_type: 'fire',
            rule_id: 'rule-2',
            source: 'internal',
          }),
        ])
      );
    });

    it('indexes suppress actions for suppressed alert episodes', async () => {
      const alertEpisodes: AlertEpisode[] = [
        {
          last_event_timestamp: '2026-01-22T07:10:00.000Z',
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-22T07:15:00.000Z',
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          episode_status: 'active',
        },
      ];

      const suppressions: AlertEpisodeSuppression[] = [
        {
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          should_suppress: true,
        },
        {
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          should_suppress: false,
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse(suppressions))
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }, { create: { _id: '2', status: 201 } }],
        errors: false,
      } as BulkResponse);

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
      });

      expect(result.startedAt).toBeInstanceOf(Date);

      const [{ operations }] = storageEsClient.bulk.mock.calls[0];
      const safeOperations = operations ?? [];
      const docs = safeOperations.filter((_, index) => index % 2 === 1);

      const suppressDocs = docs.filter((d: any) => d.action_type === 'suppress');
      const fireDocs = docs.filter((d: any) => d.action_type === 'fire');
      expect(suppressDocs).toHaveLength(1);
      expect(fireDocs).toHaveLength(1);

      expect(docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            group_hash: 'hash-1',
            last_series_event_timestamp: '2026-01-22T07:10:00.000Z',
            actor: 'system',
            action_type: 'suppress',
            rule_id: 'rule-1',
            source: 'internal',
          }),
          expect.objectContaining({
            group_hash: 'hash-2',
            last_series_event_timestamp: '2026-01-22T07:15:00.000Z',
            actor: 'system',
            action_type: 'fire',
            rule_id: 'rule-2',
            source: 'internal',
          }),
        ])
      );
    });

    it('handles empty alert episode responses', async () => {
      queryEsClient.esql.query.mockResolvedValue(createDispatchableAlertEventsResponse([]));

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
      });

      expect(result.startedAt).toBeInstanceOf(Date);
      expect(queryEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(storageEsClient.bulk).not.toHaveBeenCalled();
    });

    it('dispatches correct fire/suppress actions across 5 rules with ack, unack, snooze, and deactivate suppressions', async () => {
      const rulesMock = createRulesSavedObjectService();
      rulesSoService = rulesMock.rulesSavedObjectService;
      mockFindByIds = rulesMock.mockFindByIds;
      mockRulesFindByIds(mockFindByIds, [
        'rule-001',
        'rule-002',
        'rule-003',
        'rule-004',
        'rule-005',
      ]);

      const npMock = createActionPolicySavedObjectService();
      npSoService = npMock.actionPolicySavedObjectService;
      mockFindAllDecrypted = npMock.mockFindAllDecrypted;
      mockNpFindAllDecrypted(mockFindAllDecrypted, ['policy_456'], {
        throttle: { interval: '1h' },
      });

      mockWfm = createMockWorkflowsManagement();

      ({ dispatcherService, mockLogger } = buildDispatcherService({
        queryService,
        storageService,
        rulesSoService,
        npSoService,
        workflowsManagement: mockWfm,
      }));

      // Dataset: 5 rules, 9 episodes total
      // rule-001: single series, ack then unack → fire
      // rule-002: single series, ack with no unack → suppress
      // rule-003: two series (series-1 active, series-2 recovered + new episode) → all fire (no actions)
      // rule-004: two series, both snoozed (null episode_id) → both suppress
      // rule-005: two series, series-1 deactivated → suppress; series-2 no actions → fire
      const alertEpisodes: AlertEpisode[] = [
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-001',
          group_hash: 'rule-001-series-1',
          episode_id: 'rule-001-series-1-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-002',
          group_hash: 'rule-002-series-1',
          episode_id: 'rule-002-series-1-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-003',
          group_hash: 'rule-003-series-1',
          episode_id: 'rule-003-series-1-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:00:00.000Z',
          rule_id: 'rule-003',
          group_hash: 'rule-003-series-2',
          episode_id: 'rule-003-series-2-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:05:00.000Z',
          rule_id: 'rule-003',
          group_hash: 'rule-003-series-2',
          episode_id: 'rule-003-series-2-episode-1',
          episode_status: 'inactive',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-003',
          group_hash: 'rule-003-series-2',
          episode_id: 'rule-003-series-2-episode-2',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-004',
          group_hash: 'rule-004-series-1',
          episode_id: 'rule-004-series-1-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-004',
          group_hash: 'rule-004-series-2',
          episode_id: 'rule-004-series-2-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-005',
          group_hash: 'rule-005-series-1',
          episode_id: 'rule-005-series-1-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-005',
          group_hash: 'rule-005-series-2',
          episode_id: 'rule-005-series-2-episode-1',
          episode_status: 'active',
        },
      ];

      // Suppression query results:
      // - rule-001: ack at 16:03, then unack at 16:08 → should_suppress: false
      // - rule-002: ack at 16:03, no unack → should_suppress: true
      // - rule-003: no actions → no suppression records
      // - rule-004: snoozed at 16:03 (null episode_id, applies to all) → should_suppress: true
      // - rule-005 series-1: deactivated at 16:08 → should_suppress: true
      // - rule-005 series-2: no actions → no suppression record
      const suppressions: AlertEpisodeSuppression[] = [
        {
          rule_id: 'rule-001',
          group_hash: 'rule-001-series-1',
          episode_id: 'rule-001-series-1-episode-1',
          should_suppress: false,
        },
        {
          rule_id: 'rule-002',
          group_hash: 'rule-002-series-1',
          episode_id: 'rule-002-series-1-episode-1',
          should_suppress: true,
        },
        {
          rule_id: 'rule-004',
          group_hash: 'rule-004-series-1',
          episode_id: null,
          should_suppress: true,
        },
        {
          rule_id: 'rule-004',
          group_hash: 'rule-004-series-2',
          episode_id: null,
          should_suppress: true,
        },
        {
          rule_id: 'rule-005',
          group_hash: 'rule-005-series-1',
          episode_id: 'rule-005-series-1-episode-1',
          should_suppress: true,
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse(suppressions))
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: Array.from({ length: 10 }, (_, i) => ({
          create: { _id: String(i + 1), status: 201 },
        })),
        errors: false,
      } as BulkResponse);

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-25T00:00:00.000Z'),
      });

      expect(result.startedAt).toBeInstanceOf(Date);
      expect(queryEsClient.esql.query).toHaveBeenCalledTimes(3);

      const [{ operations }] = storageEsClient.bulk.mock.calls[0];

      const docs = (operations ?? []).filter((_, index) => index % 2 === 1) as AlertAction[];

      const fireActions = docs.filter((doc) => doc.action_type === 'fire');
      const suppressActions = docs.filter((doc) => doc.action_type === 'suppress');
      const notifiedActions = docs.filter((doc) => doc.action_type === 'notified');
      expect(fireActions).toHaveLength(6);
      expect(suppressActions).toHaveLength(4);
      expect(notifiedActions.length).toBeGreaterThan(0);

      // rule-001: fire (ack then unack cancels suppression)
      expect(docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-001',
            group_hash: 'rule-001-series-1',
            last_series_event_timestamp: '2026-01-27T16:15:00.000Z',
            action_type: 'fire',
            actor: 'system',
            source: 'internal',
          }),
        ])
      );

      // rule-002: suppress (ack with no unack)
      expect(docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-002',
            group_hash: 'rule-002-series-1',
            last_series_event_timestamp: '2026-01-27T16:15:00.000Z',
            action_type: 'suppress',
          }),
        ])
      );

      // rule-003: all fire (no actions exist)
      expect(docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-003',
            group_hash: 'rule-003-series-1',
            last_series_event_timestamp: '2026-01-27T16:15:00.000Z',
            action_type: 'fire',
          }),
          expect.objectContaining({
            rule_id: 'rule-003',
            group_hash: 'rule-003-series-2',
            last_series_event_timestamp: '2026-01-27T16:00:00.000Z',
            action_type: 'fire',
          }),
          expect.objectContaining({
            rule_id: 'rule-003',
            group_hash: 'rule-003-series-2',
            last_series_event_timestamp: '2026-01-27T16:05:00.000Z',
            action_type: 'fire',
          }),
          expect.objectContaining({
            rule_id: 'rule-003',
            group_hash: 'rule-003-series-2',
            last_series_event_timestamp: '2026-01-27T16:15:00.000Z',
            action_type: 'fire',
          }),
        ])
      );

      // rule-004: both suppress (snoozed with null episode_id)
      expect(docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-004',
            group_hash: 'rule-004-series-1',
            last_series_event_timestamp: '2026-01-27T16:15:00.000Z',
            action_type: 'suppress',
          }),
          expect.objectContaining({
            rule_id: 'rule-004',
            group_hash: 'rule-004-series-2',
            last_series_event_timestamp: '2026-01-27T16:15:00.000Z',
            action_type: 'suppress',
          }),
        ])
      );

      // rule-005: series-1 suppress (deactivated), series-2 fire (no actions)
      expect(docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-005',
            group_hash: 'rule-005-series-1',
            last_series_event_timestamp: '2026-01-27T16:15:00.000Z',
            action_type: 'suppress',
          }),
          expect.objectContaining({
            rule_id: 'rule-005',
            group_hash: 'rule-005-series-2',
            last_series_event_timestamp: '2026-01-27T16:15:00.000Z',
            action_type: 'fire',
          }),
        ])
      );
    });
  });

  describe('per-tick summary log', () => {
    it('emits a single structured info log with tick metadata and per-stage timings after a completed run', async () => {
      const alertEpisodes: AlertEpisode[] = [
        {
          last_event_timestamp: '2026-01-22T07:10:00.000Z',
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-22T07:15:00.000Z',
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          episode_status: 'inactive',
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse([]))
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }, { create: { _id: '2', status: 201 } }],
        errors: false,
      } as BulkResponse);

      const previousStartedAt = new Date('2026-01-22T07:30:00.000Z');
      const result = await dispatcherService.run({ previousStartedAt });

      const tickInfoCalls = mockLogger.info.mock.calls.filter(
        ([message]) => message === 'dispatcher tick complete'
      );
      expect(tickInfoCalls).toHaveLength(1);

      const [message, meta] = tickInfoCalls[0];
      expect(message).toBe('dispatcher tick complete');

      const tick = (meta as any)?.kibana?.alerting_v2?.dispatcher?.tick;
      expect(tick).toBeDefined();
      expect(tick.previous_started_at).toBe(previousStartedAt.toISOString());
      expect(tick.started_at).toBe(result.startedAt.toISOString());
      expect(new Date(tick.finished_at).getTime()).toBeGreaterThanOrEqual(
        result.startedAt.getTime()
      );
      expect(tick.duration_ms).toBeGreaterThanOrEqual(0);
      expect(tick.completed).toBe(true);
      expect(tick.halt_reason).toBeNull();

      const stageNames = tick.stages.map((s: { name: string }) => s.name);
      expect(stageNames).toEqual([
        'fetch_episodes',
        'fetch_suppressions',
        'apply_suppression',
        'fetch_rules',
        'apply_maintenance_window',
        'fetch_policies',
        'evaluate_matchers',
        'build_groups',
        'apply_throttling',
        'dispatch',
        'record_actions',
      ]);

      // Every stage reports the full set of known count keys (defaulting to 0),
      // so downstream ES|QL/APM aggregations have a stable schema.
      const expectedCountKeys = [
        'episodes',
        'suppressions',
        'dispatchable',
        'suppressed',
        'rules',
        'policies',
        'matched',
        'groups',
        'dispatch',
        'throttled',
      ].sort();
      for (const stage of tick.stages) {
        expect(Object.keys(stage.counts).sort()).toEqual(expectedCountKeys);
      }

      for (const stage of tick.stages) {
        expect(stage.duration_ms).toBeGreaterThanOrEqual(0);
        expect(stage.halted).toBe(false);
        expect(stage.counts).toEqual(expect.any(Object));
      }

      const fetchEpisodes = tick.stages.find((s: { name: string }) => s.name === 'fetch_episodes');
      expect(fetchEpisodes.counts.episodes).toBe(alertEpisodes.length);

      expect(result.tick).toEqual(tick);
    });

    it('reports tick.duration_ms on the same monotonic clock as the stages (sum ≲ total within rounding)', async () => {
      // Tick and stage durations must share a clock so operators can reason
      // about them together (e.g. "what % of the tick was spent in dispatch?").
      // Sum of stages is always ≤ tick total (pipeline orchestration adds a
      // small delta), and both are in fractional ms from hrtime.
      const alertEpisodes: AlertEpisode[] = [
        {
          last_event_timestamp: '2026-01-22T07:10:00.000Z',
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          episode_status: 'active',
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse([]))
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }],
        errors: false,
      } as BulkResponse);

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
      });

      const tick = result.tick;
      const stagesSum = tick.stages.reduce((acc, s) => acc + s.duration_ms, 0);

      expect(tick.duration_ms).toBeGreaterThanOrEqual(stagesSum - 0.001);
      // Overhead between the outer hrtime bracket and the sum of per-stage
      // timings should be small — a generous 500ms bound catches clock
      // regressions without flaking on loaded CI.
      expect(tick.duration_ms - stagesSum).toBeLessThan(500);
    });

    it('emits a tick summary with halt_reason set when the pipeline halts early', async () => {
      queryEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

      const previousStartedAt = new Date('2026-01-22T07:30:00.000Z');
      const result = await dispatcherService.run({ previousStartedAt });

      const tickInfoCalls = mockLogger.info.mock.calls.filter(
        ([message]) => message === 'dispatcher tick complete'
      );
      expect(tickInfoCalls).toHaveLength(1);

      const tick = (tickInfoCalls[0][1] as any)?.kibana?.alerting_v2?.dispatcher?.tick;
      expect(tick.completed).toBe(false);
      expect(tick.halt_reason).toBe('no_episodes');

      const haltedStage = tick.stages.find((s: { halted: boolean }) => s.halted);
      expect(haltedStage).toBeDefined();
      expect(haltedStage.name).toBe('fetch_episodes');
      expect(haltedStage.counts.episodes).toBe(0);

      expect(result.tick.halt_reason).toBe('no_episodes');
      expect(result.tick.completed).toBe(false);
    });

    it('emits a tick summary with halt_reason=step_error when a step throws', async () => {
      // Make the first ES|QL call (fetch_episodes) reject. The pipeline
      // should catch the throw, record it on the failing stage, and
      // surface it on the tick summary rather than letting it escape.
      queryEsClient.esql.query.mockRejectedValueOnce(new Error('es unavailable'));

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
      });

      const tickInfoCalls = mockLogger.info.mock.calls.filter(
        ([message]) => message === 'dispatcher tick complete'
      );
      expect(tickInfoCalls).toHaveLength(1);

      const tick = (tickInfoCalls[0][1] as any)?.kibana?.alerting_v2?.dispatcher?.tick;
      expect(tick.completed).toBe(false);
      expect(tick.halt_reason).toBe('step_error');

      expect(tick.stages).toHaveLength(1);
      const failed = tick.stages[0];
      expect(failed.name).toBe('fetch_episodes');
      expect(failed.halted).toBe(true);
      expect(failed.error).toEqual({
        type: expect.any(String),
        message: 'es unavailable',
      });
      expect(failed.counts.episodes).toBe(0);

      // The underlying error is also emitted at ERROR level.
      expect(mockLogger.error).toHaveBeenCalledWith(
        'es unavailable',
        expect.objectContaining({
          error: expect.objectContaining({ type: 'dispatcher:fetch_episodes' }),
        })
      );

      // Return value mirrors the log.
      expect(result.tick).toEqual(tick);
      expect(storageEsClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('event watermark plumbing', () => {
    it('anchors nextEventWatermark to the last observed episode on a fully completed tick', async () => {
      const alertEpisodes = [
        {
          last_event_timestamp: '2026-01-22T07:09:30.000Z',
          rule_id: 'rule-1',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          episode_status: 'active' as const,
        },
        {
          last_event_timestamp: '2026-01-22T07:10:00.000Z',
          rule_id: 'rule-2',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          episode_status: 'active' as const,
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse([]))
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }],
        errors: false,
      } as BulkResponse);

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
      });

      expect(result.nextEventWatermark).toBe('2026-01-22T07:10:00.000Z');
    });

    it('returns nextEventWatermark = queried lte on a no_episodes halt (empty window)', async () => {
      queryEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
      });

      expect(result.tick.halt_reason).toBe('no_episodes');
      expect(result.nextEventWatermark).toEqual(expect.any(String));
      const [firstCall] = queryEsClient.esql.query.mock.calls[0];
      const range = extractTimestampRange(firstCall);
      expect(result.nextEventWatermark).toBe(range.lte);
    });

    it('omits nextEventWatermark on a step_error halt to prevent silent data loss', async () => {
      // The window that fetch_episodes attempted to read is "lost" if the
      // watermark advances on error. Holding the watermark forces the next
      // tick to retry the same range.
      queryEsClient.esql.query.mockRejectedValueOnce(new Error('es unavailable'));

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
      });

      expect(result.tick.halt_reason).toBe('step_error');
      expect(result.nextEventWatermark).toBeUndefined();
    });

    it('threads eventWatermark from params into the fetch_episodes filter (gte boundary)', async () => {
      const watermark = moment().subtract(30, 'seconds').toDate();

      queryEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

      await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:30:00.000Z'),
        eventWatermark: watermark,
      });

      const [firstCall] = queryEsClient.esql.query.mock.calls[0];
      const range = extractTimestampRange(firstCall);
      expect(range).toHaveProperty('gte', watermark.toISOString());
      expect(range).not.toHaveProperty('gt');
    });
  });

  describe('defence in depth: pipeline-level throw', () => {
    it('still emits a tick summary and rethrows when pipeline.execute itself throws', async () => {
      const { loggerService, mockLogger: localLogger } = createLoggerService();
      const throwingPipeline: { execute: jest.Mock } = {
        execute: jest.fn().mockRejectedValue(new Error('pipeline exploded')),
      };

      const service = new DispatcherService(throwingPipeline as any, loggerService);

      const previousStartedAt = new Date('2026-01-22T07:30:00.000Z');

      await expect(service.run({ previousStartedAt })).rejects.toThrow('pipeline exploded');

      const tickInfoCalls = localLogger.info.mock.calls.filter(
        ([message]) => message === 'dispatcher tick complete'
      );
      expect(tickInfoCalls).toHaveLength(1);

      const tick = (tickInfoCalls[0][1] as any)?.kibana?.alerting_v2?.dispatcher?.tick;
      expect(tick).toMatchObject({
        completed: false,
        halt_reason: 'step_error',
        previous_started_at: previousStartedAt.toISOString(),
        stages: [],
      });

      expect(localLogger.error).toHaveBeenCalledWith(
        'pipeline exploded',
        expect.objectContaining({
          error: expect.objectContaining({ type: 'dispatcher:pipeline' }),
        })
      );
    });

  describe('executionUuid', () => {
    function buildMockPipeline(): jest.Mocked<DispatcherPipelineContract> {
      return {
        execute: jest.fn().mockResolvedValue({
          completed: true,
          haltReason: undefined,
          stageTimings: [],
          finalState: {
            input: {
              startedAt: new Date(),
              previousStartedAt: new Date(),
              executionUuid: 'unused-in-result',
            },
          },
        }),
      };
    }

    it('passes a UUID v4 to the pipeline on each run', async () => {
      const { loggerService } = createLoggerService();
      const mockPipeline = buildMockPipeline();
      const service = new DispatcherService(mockPipeline, loggerService);

      await service.run({ previousStartedAt: new Date() });

      expect(mockPipeline.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          executionUuid: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
          ),
        })
      );
    });

    it('generates a fresh UUID on every run', async () => {
      const { loggerService } = createLoggerService();
      const mockPipeline = buildMockPipeline();
      const service = new DispatcherService(mockPipeline, loggerService);

      await service.run({ previousStartedAt: new Date() });
      await service.run({ previousStartedAt: new Date() });

      const [firstCall] = mockPipeline.execute.mock.calls[0];
      const [secondCall] = mockPipeline.execute.mock.calls[1];
      expect(firstCall.executionUuid).not.toBe(secondCall.executionUuid);
    });
  });
});

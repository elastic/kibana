/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import moment from 'moment';
import type { AlertAction } from '../../resources/datastreams/alert_actions';
import type {
  ActionPolicySavedObjectAttributes,
  RuleSavedObjectAttributes,
} from '../../saved_objects';
import type { ActionPolicySavedObjectServiceContract } from '../services/action_policy_saved_object_service/action_policy_saved_object_service';
import { createActionPolicySavedObjectService } from '../services/action_policy_saved_object_service/action_policy_saved_object_service.mock';
import type { EventLogServiceContract } from '../services/event_log_service/event_log_service';
import { createEventLogService } from '../services/event_log_service/event_log_service.mock';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import type { MaintenanceWindowServiceContract } from '../services/maintenance_window_service/maintenance_window_service';
import { createMaintenanceWindowServiceMock } from '../services/maintenance_window_service/maintenance_window_service.mock';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { createQueryService } from '../services/query_service/query_service.mock';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import { createRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { createStorageService } from '../services/storage_service/storage_service.mock';
import { createRuleSoAttributes } from '../test_utils';
import {
  MAX_WINDOW_MINUTES,
  OVERLAP_WINDOW_MINUTES,
  PRE_FETCH_STUCK_ADVANCE_LAG_MS,
  STUCK_TICK_LIMIT,
  TICK_DEADLINE_MS,
} from './constants';
import { DispatcherService } from './dispatcher';
import { DispatcherPipeline, type DispatcherPipelineContract } from './execution_pipeline';
import {
  createAlertEpisodeSuppressionsResponse,
  createDispatchableAlertEventsResponse,
  createEpisodeDataResponse,
  createLastNotifiedTimestampsResponse,
} from './fixtures/dispatcher';
import { createAlertEpisode } from './fixtures/test_utils';
import { EpisodeScan } from './state';
import { getDispatchableAlertEventsQuery } from './queries';
import {
  ApplyMaintenanceWindowStep,
  ApplySuppressionStep,
  ApplyThrottlingStep,
  BuildGroupsStep,
  DispatchStep,
  EvaluateMatchersStep,
  FetchEpisodesStep,
  FetchPoliciesStep,
  FetchRulesStep,
  FetchSuppressionsStep,
  HydrateEpisodeDataStep,
  StoreActionsStep,
  StoreExecutionHistoryStep,
} from './steps';
import type { AlertEpisode, AlertEpisodeSuppression } from './types';

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
  policies: Array<string | { id: string; spaceId: string }>,
  overrides: Partial<ActionPolicySavedObjectAttributes> = {}
) {
  spy.mockResolvedValue(
    policies.map((policy) => {
      const { id, spaceId } =
        typeof policy === 'string' ? { id: policy, spaceId: 'default' } : policy;

      return {
        id,
        attributes: {
          name: `Policy ${id}`,
          description: `Description for ${id}`,
          enabled: true,
          destinations: [{ type: 'workflow', id: 'workflow-test-id' }],
          apiKey: 'test-api-key',
          apiKeyOwner: 'elastic',
          apiKeyCreatedByUser: false,
          createdBy: null,
          updatedBy: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          ...overrides,
        },
        namespaces: [spaceId],
      };
    })
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
  maintenanceWindowService: MaintenanceWindowServiceContract;
  eventLogService: EventLogServiceContract;
}): DispatcherService {
  const pipeline = new DispatcherPipeline([
    new FetchEpisodesStep(deps.queryService),
    new FetchSuppressionsStep(deps.queryService),
    new ApplySuppressionStep(),
    new HydrateEpisodeDataStep(deps.queryService),
    new FetchRulesStep(deps.rulesSoService),
    new ApplyMaintenanceWindowStep(deps.maintenanceWindowService),
    new FetchPoliciesStep(deps.npSoService),
    new EvaluateMatchersStep(),
    new BuildGroupsStep(),
    new ApplyThrottlingStep(deps.queryService),
    new DispatchStep(deps.workflowsManagement),
    new StoreActionsStep(deps.storageService),
    new StoreExecutionHistoryStep(deps.eventLogService),
  ]);
  return new DispatcherService(pipeline, deps.storageService, createLoggerService().loggerService);
}

describe('DispatcherService', () => {
  let dispatcherService: DispatcherService;
  let queryService: QueryServiceContract;
  let storageService: StorageServiceContract;
  let queryEsClient: DeeplyMockedApi<ElasticsearchClient>;
  let storageEsClient: jest.Mocked<ElasticsearchClient>;
  let rulesSoService: RulesSavedObjectServiceContract;
  let npSoService: ActionPolicySavedObjectServiceContract;
  let mockFindByIds: jest.SpyInstance;
  let mockFindAllDecrypted: jest.SpyInstance;
  let mockWfm: jest.Mocked<WorkflowsServerPluginSetup['management']>;
  let mockMwService: jest.Mocked<MaintenanceWindowServiceContract>;
  let mockEventLogService: EventLogServiceContract;

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
    mockMwService = createMaintenanceWindowServiceMock();
    ({ eventLogService: mockEventLogService } = createEventLogService());

    dispatcherService = buildDispatcherService({
      queryService,
      storageService,
      rulesSoService,
      npSoService,
      workflowsManagement: mockWfm,
      maintenanceWindowService: mockMwService,
      eventLogService: mockEventLogService,
    });
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
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-22T07:15:00.000Z',
          rule_id: 'rule-2',
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          episode_status: 'inactive',
        },
      ];

      const suppressions: AlertEpisodeSuppression[] = [
        {
          rule_id: 'rule-1',
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          should_suppress: false,
        },
        {
          rule_id: 'rule-2',
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          should_suppress: false,
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse(suppressions))
        .mockResolvedValueOnce(
          createEpisodeDataResponse([
            { episode_id: 'episode-1', data_json: null },
            { episode_id: 'episode-2', data_json: null },
          ])
        )
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }, { create: { _id: '2', status: 201 } }],
        errors: false,
      } as BulkResponse);

      const eventWatermark = new Date('2026-01-22T07:30:00.000Z');

      const result = await dispatcherService.run({
        eventWatermark,
        taskId: 'task-1',
      });

      expect(result.startedAt).toBeInstanceOf(Date);

      // windowStart = eventWatermark − OVERLAP_WINDOW_MINUTES
      // windowEnd   = windowStart + MAX_WINDOW_MINUTES (< now − settle since watermark is far in the past)
      const expectedWindowStart = moment(eventWatermark)
        .subtract(OVERLAP_WINDOW_MINUTES, 'minutes')
        .toISOString();
      const expectedWindowEnd = moment(expectedWindowStart)
        .add(MAX_WINDOW_MINUTES, 'minutes')
        .toISOString();

      expect(queryEsClient.esql.query).toHaveBeenCalledTimes(4);
      expect(queryEsClient.esql.query).toHaveBeenCalledWith(
        {
          query: getDispatchableAlertEventsQuery({
            gte: expectedWindowStart,
            lte: expectedWindowEnd,
          }).query,
          drop_null_columns: true,
          filter: {
            range: {
              '@timestamp': {
                gte: expectedWindowStart,
              },
            },
          },
          params: undefined,
        },
        { signal: expect.any(AbortSignal) }
      );

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
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-22T07:15:00.000Z',
          rule_id: 'rule-2',
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          episode_status: 'active',
        },
      ];

      const suppressions: AlertEpisodeSuppression[] = [
        {
          rule_id: 'rule-1',
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-1',
          episode_id: 'episode-1',
          should_suppress: true,
        },
        {
          rule_id: 'rule-2',
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-2',
          episode_id: 'episode-2',
          should_suppress: false,
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse(suppressions))
        .mockResolvedValueOnce(
          createEpisodeDataResponse([{ episode_id: 'episode-2', data_json: null }])
        )
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }, { create: { _id: '2', status: 201 } }],
        errors: false,
      } as BulkResponse);

      const result = await dispatcherService.run({
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        taskId: 'task-1',
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
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        taskId: 'task-1',
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
      mockMwService = createMaintenanceWindowServiceMock();
      ({ eventLogService: mockEventLogService } = createEventLogService());

      dispatcherService = buildDispatcherService({
        queryService,
        storageService,
        rulesSoService,
        npSoService,
        workflowsManagement: mockWfm,
        maintenanceWindowService: mockMwService,
        eventLogService: mockEventLogService,
      });

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
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-001-series-1',
          episode_id: 'rule-001-series-1-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-002',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-002-series-1',
          episode_id: 'rule-002-series-1-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-003',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-003-series-1',
          episode_id: 'rule-003-series-1-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:00:00.000Z',
          rule_id: 'rule-003',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-003-series-2',
          episode_id: 'rule-003-series-2-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:05:00.000Z',
          rule_id: 'rule-003',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-003-series-2',
          episode_id: 'rule-003-series-2-episode-1',
          episode_status: 'inactive',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-003',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-003-series-2',
          episode_id: 'rule-003-series-2-episode-2',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-004',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-004-series-1',
          episode_id: 'rule-004-series-1-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-004',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-004-series-2',
          episode_id: 'rule-004-series-2-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-005',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-005-series-1',
          episode_id: 'rule-005-series-1-episode-1',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-27T16:15:00.000Z',
          rule_id: 'rule-005',
          source: 'internal',
          space_id: 'default',
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
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-001-series-1',
          episode_id: 'rule-001-series-1-episode-1',
          should_suppress: false,
        },
        {
          rule_id: 'rule-002',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-002-series-1',
          episode_id: 'rule-002-series-1-episode-1',
          should_suppress: true,
        },
        {
          rule_id: 'rule-004',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-004-series-1',
          episode_id: null,
          should_suppress: true,
        },
        {
          rule_id: 'rule-004',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-004-series-2',
          episode_id: null,
          should_suppress: true,
        },
        {
          rule_id: 'rule-005',
          source: 'internal',
          space_id: 'default',
          group_hash: 'rule-005-series-1',
          episode_id: 'rule-005-series-1-episode-1',
          should_suppress: true,
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse(suppressions))
        .mockResolvedValueOnce(createEpisodeDataResponse([]))
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: Array.from({ length: 10 }, (_, i) => ({
          create: { _id: String(i + 1), status: 201 },
        })),
        errors: false,
      } as BulkResponse);

      const result = await dispatcherService.run({
        eventWatermark: new Date('2026-01-25T00:00:00.000Z'),
        taskId: 'task-1',
      });

      expect(result.startedAt).toBeInstanceOf(Date);
      expect(queryEsClient.esql.query).toHaveBeenCalledTimes(4);

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

    it('keeps external episodes isolated per space when a vendor group_hash collides', async () => {
      // The same PagerDuty incident is ingested into two spaces: identical source,
      // group_hash and episode_id. Only space-a has acked it.
      const externalEpisode = (spaceId: string): AlertEpisode => ({
        last_event_timestamp: '2026-01-22T07:10:00.000Z',
        rule_id: null,
        source: 'pagerduty',
        space_id: spaceId,
        group_hash: 'pd-incident-P1234567',
        episode_id: 'pd-ep-1',
        episode_status: 'active',
      });

      const suppressions: AlertEpisodeSuppression[] = [
        {
          rule_id: null,
          source: 'pagerduty',
          space_id: 'space-a',
          group_hash: 'pd-incident-P1234567',
          episode_id: 'pd-ep-1',
          should_suppress: true,
          last_ack_action: 'ack',
        },
      ];

      mockNpFindAllDecrypted(mockFindAllDecrypted, [
        { id: 'policy_space_a', spaceId: 'space-a' },
        { id: 'policy_space_b', spaceId: 'space-b' },
      ]);

      queryEsClient.esql.query
        .mockResolvedValueOnce(
          createDispatchableAlertEventsResponse([
            externalEpisode('space-a'),
            externalEpisode('space-b'),
          ])
        )
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse(suppressions))
        .mockResolvedValueOnce(
          createEpisodeDataResponse([{ episode_id: 'pd-ep-1', data_json: null }])
        )
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }],
        errors: false,
      } as BulkResponse);

      await dispatcherService.run({
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        taskId: 'task-1',
      });

      const [{ operations }] = storageEsClient.bulk.mock.calls[0];
      const docs = (operations ?? []).filter((_, index) => index % 2 === 1) as AlertAction[];

      expect(docs.filter((doc) => doc.action_type === 'fire')).toEqual([
        expect.objectContaining({
          action_type: 'fire',
          rule_id: null,
          source: 'pagerduty',
          space_id: 'space-b',
          group_hash: 'pd-incident-P1234567',
        }),
      ]);
      expect(docs.filter((doc) => doc.action_type === 'suppress')).toEqual([
        expect.objectContaining({
          action_type: 'suppress',
          source: 'pagerduty',
          space_id: 'space-a',
          reason: 'ack',
        }),
      ]);
    });

    it('only matches episodes whose hydrated data satisfies a KQL matcher', async () => {
      mockNpFindAllDecrypted(mockFindAllDecrypted, ['policy_456'], {
        matcher: 'data.severity: "critical"',
      });

      const alertEpisodes: AlertEpisode[] = [
        {
          last_event_timestamp: '2026-01-22T07:10:00.000Z',
          rule_id: 'rule-1',
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-1',
          episode_id: 'episode-critical',
          episode_status: 'active',
        },
        {
          last_event_timestamp: '2026-01-22T07:10:00.000Z',
          rule_id: 'rule-1',
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-2',
          episode_id: 'episode-low',
          episode_status: 'active',
        },
      ];

      const suppressions: AlertEpisodeSuppression[] = [
        {
          rule_id: 'rule-1',
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-1',
          episode_id: 'episode-critical',
          should_suppress: false,
        },
        {
          rule_id: 'rule-1',
          source: 'internal',
          space_id: 'default',
          group_hash: 'hash-2',
          episode_id: 'episode-low',
          should_suppress: false,
        },
      ];

      queryEsClient.esql.query
        .mockResolvedValueOnce(createDispatchableAlertEventsResponse(alertEpisodes))
        .mockResolvedValueOnce(createAlertEpisodeSuppressionsResponse(suppressions))
        .mockResolvedValueOnce(
          createEpisodeDataResponse([
            { episode_id: 'episode-critical', data_json: JSON.stringify({ severity: 'critical' }) },
            { episode_id: 'episode-low', data_json: JSON.stringify({ severity: 'low' }) },
          ])
        )
        .mockResolvedValueOnce(createLastNotifiedTimestampsResponse());

      storageEsClient.bulk.mockResolvedValue({
        items: [{ create: { _id: '1', status: 201 } }],
        errors: false,
      } as BulkResponse);

      await dispatcherService.run({
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        taskId: 'task-1',
      });

      const [{ operations }] = storageEsClient.bulk.mock.calls[0];
      const docs = (operations ?? []).filter((_, index) => index % 2 === 1) as AlertAction[];

      const fireActions = docs.filter((d: any) => d.action_type === 'fire');
      expect(fireActions).toHaveLength(1);
      expect(fireActions[0]).toEqual(
        expect.objectContaining({ group_hash: 'hash-1', rule_id: 'rule-1' })
      );

      const unmatchedActions = docs.filter((d: any) => d.action_type === 'unmatched');
      expect(unmatchedActions).toHaveLength(1);
      expect(unmatchedActions[0]).toEqual(expect.objectContaining({ group_hash: 'hash-2' }));
    });
  });

  describe('executionUuid', () => {
    function buildMockPipeline(): jest.Mocked<DispatcherPipelineContract> {
      return {
        execute: jest.fn().mockResolvedValue({
          completed: true,
          finalState: {
            input: {
              startedAt: new Date(),
              eventWatermark: new Date(),
              windowStart: new Date(),
              windowEnd: new Date(),
              executionUuid: 'unused-in-result',
              signal: new AbortController().signal,
            },
          },
        }),
      };
    }

    it('generates a fresh UUID on every run', async () => {
      const { storageService: noopStorage } = createStorageService();
      const mockPipeline = buildMockPipeline();
      const service = new DispatcherService(
        mockPipeline,
        noopStorage,
        createLoggerService().loggerService
      );

      await service.run({
        eventWatermark: new Date(),
        taskId: 'task-1',
      });
      await service.run({
        eventWatermark: new Date(),
        taskId: 'task-1',
      });

      const [firstCall] = mockPipeline.execute.mock.calls[0];
      const [secondCall] = mockPipeline.execute.mock.calls[1];
      expect(firstCall.executionUuid).not.toBe(secondCall.executionUuid);
    });

    it('logs DISPATCHER_COLD_START when no watermark is provided', async () => {
      const { loggerService, mockLogger } = createLoggerService();
      const { storageService: noopStorage } = createStorageService();
      const mockPipeline = buildMockPipeline();
      const service = new DispatcherService(mockPipeline, noopStorage, loggerService);

      await service.run({ taskId: 'task-1' });

      // LoggerService.warn forwards (message, { labels: { code } }) to the raw logger
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          labels: expect.objectContaining({ code: 'DISPATCHER_COLD_START' }),
        })
      );
    });

    it('does not log cold start when a watermark is provided', async () => {
      const { loggerService, mockLogger } = createLoggerService();
      const { storageService: noopStorage } = createStorageService();
      const mockPipeline = buildMockPipeline();
      const service = new DispatcherService(mockPipeline, noopStorage, loggerService);

      await service.run({
        eventWatermark: new Date(),
        taskId: 'task-1',
      });

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  // ── rna-program#436 regression ──────────────────────────────────────────────
  // Before the fix, a truncated tick left nextWatermark = startedAt (wall clock),
  // skipping the deferred tail permanently. After the fix, nextWatermark must be
  // the last returned episode's timestamp so the tail is re-read next tick.
  describe('rna-program#436 regression: truncated tick must not advance watermark past deferred tail', () => {
    function buildMockTruncatedPipeline(
      lastEpisodeTs: string
    ): jest.Mocked<DispatcherPipelineContract> {
      const episodes = [
        createAlertEpisode({ episode_id: 'e1', last_event_timestamp: '2026-01-22T07:21:00.000Z' }),
        createAlertEpisode({ episode_id: 'e2', last_event_timestamp: lastEpisodeTs }),
      ];
      const mockInput = {
        startedAt: new Date('2026-01-22T08:00:00.000Z'),
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        windowStart: new Date('2026-01-22T07:20:00.000Z'),
        windowEnd: new Date('2026-01-22T07:35:00.000Z'),
        executionUuid: 'test-uuid',
        signal: new AbortController().signal,
      };
      return {
        execute: jest.fn().mockResolvedValue({
          completed: true,
          finalState: {
            input: mockInput,
            scan: EpisodeScan.of({ episodes, truncated: true }),
            recordedEpisodes: 2,
          },
        }),
      };
    }

    it('tick 1 truncated: nextWatermark is the last episode ts, not startedAt', async () => {
      const { storageService: noopStorage } = createStorageService();
      const lastEpisodeTs = '2026-01-22T07:33:00.000Z';
      const mockPipeline = buildMockTruncatedPipeline(lastEpisodeTs);
      const service = new DispatcherService(
        mockPipeline,
        noopStorage,
        createLoggerService().loggerService
      );

      const result = await service.run({
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        taskId: 'task-1',
      });

      expect(result.nextWatermark.toISOString()).toBe(lastEpisodeTs);
      // On main (before fix), nextWatermark === startedAt which is ~now — far ahead of lastEpisodeTs.
      expect(result.nextWatermark.toISOString()).not.toBe(result.startedAt.toISOString());
    });

    it('tick 2 starts from the truncation edge and covers the deferred tail', async () => {
      const { storageService: noopStorage } = createStorageService();
      const tick1LastEpisodeTs = '2026-01-22T07:33:00.000Z';

      // Tick 1: truncated — watermark advances to 07:33
      const pipeline1 = buildMockTruncatedPipeline(tick1LastEpisodeTs);
      const service = new DispatcherService(
        pipeline1,
        noopStorage,
        createLoggerService().loggerService
      );
      const tick1 = await service.run({
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        taskId: 'task-1',
      });

      expect(tick1.nextWatermark.toISOString()).toBe(tick1LastEpisodeTs);

      // Tick 2 begins from 07:33 → windowStart = 07:23, windowEnd = 07:38.
      // The deferred tail (events between 07:33 and 07:35) is within this window.
      // We verify tick 2 does NOT skip: its windowStart ≤ tick1LastEpisodeTs.
      const tick2MockInput = {
        startedAt: new Date('2026-01-22T08:01:00.000Z'),
        eventWatermark: tick1.nextWatermark,
        windowStart: moment(tick1.nextWatermark)
          .subtract(OVERLAP_WINDOW_MINUTES, 'minutes')
          .toDate(),
        windowEnd: moment(tick1.nextWatermark)
          .subtract(OVERLAP_WINDOW_MINUTES, 'minutes')
          .add(MAX_WINDOW_MINUTES, 'minutes')
          .toDate(),
        executionUuid: 'test-uuid-2',
        signal: new AbortController().signal,
      };
      const pipeline2: jest.Mocked<DispatcherPipelineContract> = {
        execute: jest.fn().mockResolvedValue({
          completed: true,
          finalState: {
            input: tick2MockInput,
            scan: EpisodeScan.empty(),
            recordedEpisodes: 0,
          },
        }),
      };
      const service2 = new DispatcherService(
        pipeline2,
        noopStorage,
        createLoggerService().loggerService
      );
      await service2.run({ eventWatermark: tick1.nextWatermark, taskId: 'task-1' });

      const [[tick2Input]] = pipeline2.execute.mock.calls;
      expect(tick2Input.windowStart.getTime()).toBeLessThanOrEqual(
        new Date(tick1LastEpisodeTs).getTime()
      );
      expect(tick2Input.eventWatermark.toISOString()).toBe(tick1LastEpisodeTs);
    });
  });

  // ── Phase 4: soft deadline ───────────────────────────────────────────────────
  describe('soft deadline (TICK_DEADLINE_MS)', () => {
    function buildNeverResolvingPipeline(): jest.Mocked<DispatcherPipelineContract> {
      return {
        // Pipeline that fires the deadline by returning an aborted result after
        // the fake-timer advance triggers the deadline controller's timeout.
        execute: jest.fn().mockImplementation(({ signal }: { signal: AbortSignal }) => {
          return new Promise((resolve) => {
            signal.addEventListener('abort', () => {
              resolve({
                completed: false,
                haltReason: 'aborted',
                finalState: {
                  input: {
                    startedAt: new Date(),
                    eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
                    windowStart: new Date('2026-01-22T07:20:00.000Z'),
                    windowEnd: new Date('2026-01-22T07:35:00.000Z'),
                    executionUuid: 'test',
                    signal,
                  },
                  // recordedEpisodes undefined — aborted before StoreActionsStep
                },
              });
            });
          });
        }),
      };
    }

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('run() resolves after TICK_DEADLINE_MS even when the pipeline never completes', async () => {
      const { storageService: noopStorage } = createStorageService();
      const mockPipeline = buildNeverResolvingPipeline();
      const service = new DispatcherService(
        mockPipeline,
        noopStorage,
        createLoggerService().loggerService
      );

      const resultPromise = service.run({
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        taskId: 'task-1',
      });

      // Advance fake timers past the deadline
      jest.advanceTimersByTime(TICK_DEADLINE_MS + 1);

      const result = await resultPromise;

      expect(result).toHaveProperty('startedAt');
      expect(result).toHaveProperty('nextWatermark');
      expect(result.pipelineResult.haltReason).toBe('aborted');
    });

    it('watermark does not advance when deadline fires before StoreActionsStep', async () => {
      const { storageService: noopStorage } = createStorageService();
      const mockPipeline = buildNeverResolvingPipeline();
      const service = new DispatcherService(
        mockPipeline,
        noopStorage,
        createLoggerService().loggerService
      );

      const eventWatermark = new Date('2026-01-22T07:30:00.000Z');
      const resultPromise = service.run({ eventWatermark, taskId: 'task-1' });

      jest.advanceTimersByTime(TICK_DEADLINE_MS + 1);

      const result = await resultPromise;

      // Aborted before StoreActionsStep → no advance
      expect(result.nextWatermark.toISOString()).toBe(eventWatermark.toISOString());
    });

    it('logs DISPATCHER_TICK_DEADLINE_EXCEEDED on deadline abort', async () => {
      const { loggerService, mockLogger } = createLoggerService();
      const { storageService: noopStorage } = createStorageService();
      const mockPipeline = buildNeverResolvingPipeline();
      const service = new DispatcherService(mockPipeline, noopStorage, loggerService);

      const resultPromise = service.run({
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        taskId: 'task-1',
      });
      jest.advanceTimersByTime(TICK_DEADLINE_MS + 1);
      await resultPromise;

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          labels: expect.objectContaining({ code: 'DISPATCHER_TICK_DEADLINE_EXCEEDED' }),
        })
      );
    });

    it('TM signal aborting also halts the pipeline', async () => {
      const { storageService: noopStorage } = createStorageService();
      const mockPipeline = buildNeverResolvingPipeline();
      const service = new DispatcherService(
        mockPipeline,
        noopStorage,
        createLoggerService().loggerService
      );

      const tmController = new AbortController();
      const resultPromise = service.run({
        eventWatermark: new Date('2026-01-22T07:30:00.000Z'),
        signal: tmController.signal,
        taskId: 'task-1',
      });

      // Abort via TM signal before the deadline fires
      tmController.abort();

      const result = await resultPromise;

      expect(result.pipelineResult.haltReason).toBe('aborted');
      // Deadline did not fire — only TM signal aborted
    });
  });

  // ── Phase 5: stuck-watermark escape hatch ────────────────────────────────────
  describe('stuck-watermark escape hatch (STUCK_TICK_LIMIT)', () => {
    // Returns a pipeline whose watermark stays pinned. `haltReason: 'aborted'` with
    // no `recordedEpisodes` is the only path through computeNextWatermark that
    // returns `input.eventWatermark` unchanged — simulating a tick where the pipeline
    // was interrupted before StoreActionsStep wrote any records.
    function buildStuckPipeline(episodes: AlertEpisode[]): jest.Mocked<DispatcherPipelineContract> {
      return {
        execute: jest
          .fn()
          .mockImplementation(
            ({ signal, eventWatermark, windowStart, windowEnd, startedAt, executionUuid }) => {
              const input = {
                startedAt,
                eventWatermark,
                windowStart,
                windowEnd,
                executionUuid,
                signal,
              };
              return Promise.resolve({
                completed: false,
                haltReason: 'aborted',
                finalState: {
                  input,
                  scan: EpisodeScan.of({ episodes }),
                  // recordedEpisodes absent → computeNextWatermark returns input.eventWatermark
                },
              });
            }
          ),
      };
    }

    it('nextStuckTicks increments on stuck ticks and resets to 0 on advance', async () => {
      const { storageService: noopStorage } = createStorageService();
      const eventWatermark = new Date('2026-01-22T07:30:00.000Z');

      // Stuck pipeline — episodes present but no recordedEpisodes → watermark won't advance
      const mockPipeline = buildStuckPipeline([
        createAlertEpisode({ episode_id: 'e1', last_event_timestamp: '2026-01-22T07:31:00.000Z' }),
      ]);
      const service = new DispatcherService(
        mockPipeline,
        noopStorage,
        createLoggerService().loggerService
      );

      const result = await service.run({ eventWatermark, stuckTicks: 4, taskId: 'task-1' });

      // Watermark did not advance → stuckTicks was 4 → nextStuckTicks = 5
      expect(result.nextStuckTicks).toBe(5);
      expect(result.nextWatermark.toISOString()).toBe(eventWatermark.toISOString());
    });

    it('nextStuckTicks resets to 0 when watermark advances', async () => {
      const { storageService: noopStorage } = createStorageService();
      const eventWatermark = new Date('2026-01-22T07:30:00.000Z');

      // Pipeline that advances the watermark (no_episodes → windowEnd > eventWatermark)
      const advancingPipeline: jest.Mocked<DispatcherPipelineContract> = {
        execute: jest
          .fn()
          .mockImplementation(
            ({ signal, eventWatermark: ew, windowStart, windowEnd, startedAt, executionUuid }) => {
              return Promise.resolve({
                completed: true,
                haltReason: 'no_episodes',
                finalState: {
                  input: {
                    startedAt,
                    eventWatermark: ew,
                    windowStart,
                    windowEnd,
                    executionUuid,
                    signal,
                  },
                },
              });
            }
          ),
      };
      const service = new DispatcherService(
        advancingPipeline,
        noopStorage,
        createLoggerService().loggerService
      );

      // Had 5 stuck ticks before, but this tick advances → reset
      const result = await service.run({ eventWatermark, stuckTicks: 5, taskId: 'task-1' });

      expect(result.nextStuckTicks).toBe(0);
      expect(result.nextWatermark.getTime()).toBeGreaterThan(eventWatermark.getTime());
    });

    it('fires escape hatch after STUCK_TICK_LIMIT ticks: advances watermark and resets counter', async () => {
      const { storageService: escapeStorage, mockEsClient: escapeMockEsClient } =
        createStorageService();
      escapeMockEsClient.bulk.mockResolvedValue({ errors: false, took: 0, items: [] });

      const eventWatermark = new Date('2026-01-22T07:30:00.000Z');
      const blockingEpisode = createAlertEpisode({
        episode_id: 'blocked-e1',
        last_event_timestamp: '2026-01-22T07:31:00.000Z',
        space_id: 'default',
      });

      const mockPipeline = buildStuckPipeline([blockingEpisode]);
      const service = new DispatcherService(
        mockPipeline,
        escapeStorage,
        createLoggerService().loggerService
      );

      // Pass stuckTicks = STUCK_TICK_LIMIT - 1 so this tick pushes over the limit
      const result = await service.run({
        eventWatermark,
        stuckTicks: STUCK_TICK_LIMIT - 1,
        taskId: 'task-1',
      });

      // Watermark must advance to windowEnd
      expect(result.nextWatermark.getTime()).toBeGreaterThan(eventWatermark.getTime());
      // Counter must reset
      expect(result.nextStuckTicks).toBe(0);
      // Terminal unmatched records must have been bulk-indexed
      expect(escapeMockEsClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          operations: expect.arrayContaining([
            expect.objectContaining({ create: expect.any(Object) }),
            expect.objectContaining({
              group_hash: blockingEpisode.group_hash,
              action_type: 'unmatched',
              actor: 'system',
              rule_id: blockingEpisode.rule_id,
              reason: expect.stringContaining('escape hatch'),
            }),
          ]),
        })
      );
    });

    it('logs DISPATCHER_WATERMARK_STUCK at error level when escape hatch fires', async () => {
      const { loggerService, mockLogger } = createLoggerService();
      const { storageService: escapeStorage, mockEsClient: escapeMockEsClient } =
        createStorageService();
      escapeMockEsClient.bulk.mockResolvedValue({ errors: false, took: 0, items: [] });

      const eventWatermark = new Date('2026-01-22T07:30:00.000Z');

      const mockPipeline = buildStuckPipeline([
        createAlertEpisode({ episode_id: 'e1', last_event_timestamp: '2026-01-22T07:31:00.000Z' }),
      ]);
      const service = new DispatcherService(mockPipeline, escapeStorage, loggerService);

      await service.run({
        eventWatermark,
        stuckTicks: STUCK_TICK_LIMIT - 1,
        taskId: 'task-1',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          labels: expect.objectContaining({ code: 'DISPATCHER_WATERMARK_STUCK' }),
        })
      );
    });

    it('holds the watermark when pre-fetch hatch fires and lag is within one max window', async () => {
      const { loggerService, mockLogger } = createLoggerService();
      const { storageService: escapeStorage, mockEsClient: escapeMockEsClient } =
        createStorageService();
      // Lag ≈ 1m, well under PRE_FETCH_STUCK_ADVANCE_LAG_MS (15m).
      const eventWatermark = new Date(Date.now() - 60_000);

      const mockPipeline = buildStuckPipeline([]);
      const service = new DispatcherService(mockPipeline, escapeStorage, loggerService);

      const result = await service.run({
        eventWatermark,
        stuckTicks: STUCK_TICK_LIMIT - 1,
        taskId: 'task-1',
      });

      expect(result.nextWatermark.toISOString()).toBe(eventWatermark.toISOString());
      expect(result.nextStuckTicks).toBe(0);
      expect(escapeMockEsClient.bulk).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          labels: expect.objectContaining({ code: 'DISPATCHER_ESCAPE_HATCH_PRE_FETCH_STUCK' }),
        })
      );
    });

    it('force-advances when pre-fetch hatch fires and lag exceeds one max window', async () => {
      const { loggerService, mockLogger } = createLoggerService();
      const { storageService: escapeStorage, mockEsClient: escapeMockEsClient } =
        createStorageService();
      const eventWatermark = new Date(Date.now() - PRE_FETCH_STUCK_ADVANCE_LAG_MS - 60_000);

      const mockPipeline = buildStuckPipeline([]);
      const service = new DispatcherService(mockPipeline, escapeStorage, loggerService);

      const result = await service.run({
        eventWatermark,
        stuckTicks: STUCK_TICK_LIMIT - 1,
        taskId: 'task-1',
      });

      expect(result.nextWatermark.getTime()).toBeGreaterThan(eventWatermark.getTime());
      expect(result.nextStuckTicks).toBe(0);
      expect(escapeMockEsClient.bulk).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          labels: expect.objectContaining({
            code: 'DISPATCHER_ESCAPE_HATCH_PRE_FETCH_FORCED_ADVANCE',
          }),
        })
      );
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ALERT_ACTIONS_DATA_STREAM, type AlertAction } from '../../../resources/alert_actions';
import { ALERT_EVENTS_DATA_STREAM, type AlertEvent } from '../../../resources/alert_events';
import type {
  RuleSavedObjectAttributes,
  NotificationPolicySavedObjectAttributes,
} from '../../../saved_objects';
import {
  RULE_SAVED_OBJECT_TYPE,
  NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
} from '../../../saved_objects';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { NotificationPolicySavedObjectService } from '../../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import type { NotificationPolicySavedObjectServiceContract } from '../../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import {
  QueryService,
  type QueryServiceContract,
} from '../../services/query_service/query_service';
import { RulesSavedObjectService } from '../../services/rules_saved_object_service/rules_saved_object_service';
import type { RulesSavedObjectServiceContract } from '../../services/rules_saved_object_service/rules_saved_object_service';
import {
  StorageService,
  type StorageServiceContract,
} from '../../services/storage_service/storage_service';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { DispatcherService, type DispatcherServiceContract } from '../dispatcher';
import { DispatcherPipeline } from '../execution_pipeline';
import {
  FetchEpisodesStep,
  FetchSuppressionsStep,
  ApplySuppressionStep,
  FetchRulesStep,
  FetchPoliciesStep,
  EvaluateMatchersStep,
  BuildGroupsStep,
  ApplyThrottlingStep,
  DispatchStep,
  StoreActionsStep,
} from '../steps';
import { waitForDataStreamsReady } from './helpers/wait';
import { setupTestServers } from './setup_test_servers';

/**
 * Test dataset representing alert events for a single rule with multiple episodes:
 *
 * Episode 1: active -> inactive
 * Episode 2: active -> inactive
 * Episode 3: active
 */
const ALERT_EVENTS_TEST_DATA: AlertEvent[] = [
  {
    '@timestamp': '2026-01-22T07:50:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1', version: 1 },
    group_hash: 'rule-1-series-1',
    episode: {
      id: 'rule-1-series-1-episode-3',
      status: 'active',
    },
    data: {},
    status: 'breached',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:25:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1', version: 1 },
    group_hash: 'rule-1-series-1',
    episode: {
      id: 'rule-1-series-1-episode-2',
      status: 'inactive',
    },
    data: {},
    status: 'recovered',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:20:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1', version: 1 },
    group_hash: 'rule-1-series-1',
    episode: {
      id: 'rule-1-series-1-episode-2',
      status: 'active',
    },
    data: {},
    status: 'breached',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:15:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1', version: 1 },
    group_hash: 'rule-1-series-1',
    episode: {
      id: 'rule-1-series-1-episode-1',
      status: 'inactive',
    },
    data: {},
    status: 'recovered',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-22T07:10:00.000Z',
    type: 'alert',
    rule: { id: 'rule-1', version: 1 },
    group_hash: 'rule-1-series-1',
    episode: {
      id: 'rule-1-series-1-episode-1',
      status: 'active',
    },
    data: {},
    status: 'breached',
    source: 'internal',
  },
];

/**
 * 5 rules with various suppression scenarios:
 * - rule-001: single series, ack then unack → fire
 * - rule-002: single series, ack with no unack → suppress
 * - rule-003: two series (no user actions) → all fire
 * - rule-004: two series, both snoozed → both suppress
 * - rule-005: series-1 deactivated → suppress; series-2 no actions → fire
 */
const SUPPRESSION_ALERT_EVENTS: AlertEvent[] = [
  // rule-001: single series, 4 events
  ...(['16:00', '16:05', '16:10', '16:15'] as const).map(
    (time): AlertEvent => ({
      '@timestamp': `2026-01-27T${time}:00.000Z`,
      type: 'alert',
      rule: { id: 'rule-001', version: 1 },
      group_hash: 'rule-001-series-1',
      episode: { id: 'rule-001-series-1-episode-1', status: 'active' },
      data: {},
      status: 'breached',
      source: 'internal',
    })
  ),
  // rule-002: single series, 4 events
  ...(['16:00', '16:05', '16:10', '16:15'] as const).map(
    (time): AlertEvent => ({
      '@timestamp': `2026-01-27T${time}:00.000Z`,
      type: 'alert',
      rule: { id: 'rule-002', version: 1 },
      group_hash: 'rule-002-series-1',
      episode: { id: 'rule-002-series-1-episode-1', status: 'active' },
      data: {},
      status: 'breached',
      source: 'internal',
    })
  ),
  // rule-003 series-1: 4 events, all active
  ...(['16:00', '16:05', '16:10', '16:15'] as const).map(
    (time): AlertEvent => ({
      '@timestamp': `2026-01-27T${time}:00.000Z`,
      type: 'alert',
      rule: { id: 'rule-003', version: 1 },
      group_hash: 'rule-003-series-1',
      episode: { id: 'rule-003-series-1-episode-1', status: 'active' },
      data: {},
      status: 'breached',
      source: 'internal',
    })
  ),
  // rule-003 series-2: episode-1 active then recovered, episode-2 active
  {
    '@timestamp': '2026-01-27T16:00:00.000Z',
    type: 'alert',
    rule: { id: 'rule-003', version: 1 },
    group_hash: 'rule-003-series-2',
    episode: { id: 'rule-003-series-2-episode-1', status: 'active' },
    data: {},
    status: 'breached',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-27T16:05:00.000Z',
    type: 'alert',
    rule: { id: 'rule-003', version: 1 },
    group_hash: 'rule-003-series-2',
    episode: { id: 'rule-003-series-2-episode-1', status: 'inactive' },
    data: {},
    status: 'recovered',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-27T16:10:00.000Z',
    type: 'alert',
    rule: { id: 'rule-003', version: 1 },
    group_hash: 'rule-003-series-2',
    episode: { id: 'rule-003-series-2-episode-2', status: 'active' },
    data: {},
    status: 'breached',
    source: 'internal',
  },
  {
    '@timestamp': '2026-01-27T16:15:00.000Z',
    type: 'alert',
    rule: { id: 'rule-003', version: 1 },
    group_hash: 'rule-003-series-2',
    episode: { id: 'rule-003-series-2-episode-2', status: 'active' },
    data: {},
    status: 'breached',
    source: 'internal',
  },
  // rule-004 series-1: 4 events
  ...(['16:00', '16:05', '16:10', '16:15'] as const).map(
    (time): AlertEvent => ({
      '@timestamp': `2026-01-27T${time}:00.000Z`,
      type: 'alert',
      rule: { id: 'rule-004', version: 1 },
      group_hash: 'rule-004-series-1',
      episode: { id: 'rule-004-series-1-episode-1', status: 'active' },
      data: {},
      status: 'breached',
      source: 'internal',
    })
  ),
  // rule-004 series-2: 4 events
  ...(['16:00', '16:05', '16:10', '16:15'] as const).map(
    (time): AlertEvent => ({
      '@timestamp': `2026-01-27T${time}:00.000Z`,
      type: 'alert',
      rule: { id: 'rule-004', version: 1 },
      group_hash: 'rule-004-series-2',
      episode: { id: 'rule-004-series-2-episode-1', status: 'active' },
      data: {},
      status: 'breached',
      source: 'internal',
    })
  ),
  // rule-005 series-1: 4 events
  ...(['16:00', '16:05', '16:10', '16:15'] as const).map(
    (time): AlertEvent => ({
      '@timestamp': `2026-01-27T${time}:00.000Z`,
      type: 'alert',
      rule: { id: 'rule-005', version: 1 },
      group_hash: 'rule-005-series-1',
      episode: { id: 'rule-005-series-1-episode-1', status: 'active' },
      data: {},
      status: 'breached',
      source: 'internal',
    })
  ),
  // rule-005 series-2: 4 events
  ...(['16:00', '16:05', '16:10', '16:15'] as const).map(
    (time): AlertEvent => ({
      '@timestamp': `2026-01-27T${time}:00.000Z`,
      type: 'alert',
      rule: { id: 'rule-005', version: 1 },
      group_hash: 'rule-005-series-2',
      episode: { id: 'rule-005-series-2-episode-1', status: 'active' },
      data: {},
      status: 'breached',
      source: 'internal',
    })
  ),
];

/**
 * User actions from the dataset that drive suppression decisions:
 * - rule-001: ack then unack (suppression cancelled)
 * - rule-002: ack only (suppressed)
 * - rule-004: snooze both series (suppressed, no episode_id → applies to all)
 * - rule-005: deactivate series-1 (suppressed)
 */
const SUPPRESSION_USER_ACTIONS: AlertAction[] = [
  // rule-001: ack at 16:03
  {
    '@timestamp': '2026-01-27T16:03:00.000Z',
    actor: 'elastic',
    action_type: 'ack',
    last_series_event_timestamp: '2026-01-27T16:00:00.000Z',
    rule_id: 'rule-001',
    group_hash: 'rule-001-series-1',
    episode_id: 'rule-001-series-1-episode-1',
  },
  // rule-001: unack at 16:08 (cancels the ack)
  {
    '@timestamp': '2026-01-27T16:08:00.000Z',
    actor: 'elastic',
    action_type: 'unack',
    last_series_event_timestamp: '2026-01-27T16:05:00.000Z',
    rule_id: 'rule-001',
    group_hash: 'rule-001-series-1',
    episode_id: 'rule-001-series-1-episode-1',
  },
  // rule-002: ack at 16:03 (no unack → stays suppressed)
  {
    '@timestamp': '2026-01-27T16:03:00.000Z',
    actor: 'elastic',
    action_type: 'ack',
    last_series_event_timestamp: '2026-01-27T16:00:00.000Z',
    rule_id: 'rule-002',
    group_hash: 'rule-002-series-1',
    episode_id: 'rule-002-series-1-episode-1',
  },
  // rule-004 series-1: snooze at 16:03 (no episode_id, expiry far future)
  {
    '@timestamp': '2026-01-27T16:03:00.000Z',
    actor: 'elastic',
    action_type: 'snooze',
    last_series_event_timestamp: '2026-01-27T16:00:00.000Z',
    expiry: '2026-01-28T16:03:00.000Z',
    rule_id: 'rule-004',
    group_hash: 'rule-004-series-1',
  },
  // rule-004 series-2: snooze at 16:03 (no episode_id, expiry far future)
  {
    '@timestamp': '2026-01-27T16:03:00.000Z',
    actor: 'elastic',
    action_type: 'snooze',
    last_series_event_timestamp: '2026-01-27T16:00:00.000Z',
    expiry: '2026-01-28T16:03:00.000Z',
    rule_id: 'rule-004',
    group_hash: 'rule-004-series-2',
  },
  // rule-005 series-1: deactivate at 16:08
  {
    '@timestamp': '2026-01-27T16:08:00.000Z',
    actor: 'elastic',
    action_type: 'deactivate',
    last_series_event_timestamp: '2026-01-27T16:05:00.000Z',
    rule_id: 'rule-005',
    group_hash: 'rule-005-series-1',
    episode_id: 'rule-005-series-1-episode-1',
  },
];

const createMockWorkflowsManagement = (): WorkflowsServerPluginSetup['management'] =>
  ({
    getWorkflow: jest.fn().mockResolvedValue(null),
    runWorkflow: jest.fn().mockResolvedValue('exec-1'),
  } as unknown as WorkflowsServerPluginSetup['management']);

describe('DispatcherService integration tests', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let esClient: ElasticsearchClient;
  let dispatcherService: DispatcherServiceContract;
  let queryService: QueryServiceContract;
  let storageService: StorageServiceContract;
  let mockLoggerService: LoggerServiceContract;
  let rulesSoService: RulesSavedObjectServiceContract;
  let npSoService: NotificationPolicySavedObjectServiceContract;
  let mockWfm: WorkflowsServerPluginSetup['management'];

  beforeAll(async () => {
    const servers = await setupTestServers();
    esServer = servers.esServer;
    kibanaServer = servers.kibanaServer;
    esClient = kibanaServer.coreStart.elasticsearch.client.asInternalUser;

    rulesSoService = new RulesSavedObjectService(
      kibanaServer.coreStart.savedObjects.getUnsafeInternalClient({
        includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
      }),
      undefined as unknown as SpacesPluginStart
    );
    npSoService = new NotificationPolicySavedObjectService(
      kibanaServer.coreStart.savedObjects.getUnsafeInternalClient({
        includedHiddenTypes: [NOTIFICATION_POLICY_SAVED_OBJECT_TYPE],
      }),
      undefined as unknown as SpacesPluginStart,
      undefined as unknown as EncryptedSavedObjectsClient
    );

    await waitForDataStreamsReady(esClient, [ALERT_EVENTS_DATA_STREAM, ALERT_ACTIONS_DATA_STREAM]);

    await seedRulesAndPolicies(rulesSoService, npSoService);
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

    queryService = new QueryService(esClient, mockLoggerService);
    storageService = new StorageService(esClient, mockLoggerService);
    mockWfm = createMockWorkflowsManagement();

    jest.spyOn(npSoService, 'findAllDecrypted').mockImplementation(async () => {
      const { saved_objects: allPolicies } = await npSoService.find({
        page: 1,
        perPage: 1000,
      });
      return allPolicies.map((doc) => ({ id: doc.id, attributes: doc.attributes }));
    });

    const pipeline = new DispatcherPipeline(mockLoggerService, [
      new FetchEpisodesStep(queryService),
      new FetchSuppressionsStep(queryService),
      new ApplySuppressionStep(),
      new FetchRulesStep(rulesSoService),
      new FetchPoliciesStep(npSoService),
      new EvaluateMatchersStep(),
      new BuildGroupsStep(),
      new ApplyThrottlingStep(queryService, mockLoggerService),
      new DispatchStep(mockLoggerService, mockWfm),
      new StoreActionsStep(storageService),
    ]);
    dispatcherService = new DispatcherService(pipeline);
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

  describe('when there are alert events without prior "fire" actions', () => {
    it('should dispatch all unique episodes', async () => {
      await seedAlertEvents(esClient, ALERT_EVENTS_TEST_DATA);

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      expect(result.startedAt).toBeDefined();

      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });

      const actionsResponse = await esClient.search({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: { term: { action_type: 'fire' } },
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
          action_type: 'fire',
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

  describe('when some episodes already have fires', () => {
    it('should only dispatch the new events', async () => {
      await seedAlertEvents(esClient, ALERT_EVENTS_TEST_DATA);

      await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      await seedAlertEvents(esClient, [
        {
          '@timestamp': '2026-01-22T07:55:00.000Z',
          type: 'alert',
          rule: { id: 'rule-1', version: 1 },
          group_hash: 'rule-1-series-1',
          episode: {
            id: 'rule-1-series-1-episode-3',
            status: 'inactive',
          },
          data: {},
          status: 'recovered',
          source: 'internal',
        },
      ]);

      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });

      await dispatcherService.run({
        previousStartedAt: new Date('2026-01-22T07:00:00.000Z'),
      });

      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });

      const actionsResponse = await esClient.search({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: {
          bool: {
            must: [
              { term: { action_type: 'fire' } },
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

  describe('when alert episodes have user actions (ack, snooze, deactivate)', () => {
    it('should dispatch fire actions for non-suppressed episodes and suppress actions for suppressed ones', async () => {
      await seedAlertEvents(esClient, SUPPRESSION_ALERT_EVENTS);
      await seedAlertActions(esClient, SUPPRESSION_USER_ACTIONS);

      const result = await dispatcherService.run({
        previousStartedAt: new Date('2026-01-25T00:00:00.000Z'),
      });

      expect(result.startedAt).toBeDefined();

      await esClient.indices.refresh({ index: ALERT_ACTIONS_DATA_STREAM });

      const actionsResponse = await esClient.search({
        index: ALERT_ACTIONS_DATA_STREAM,
        query: {
          bool: {
            filter: [{ terms: { action_type: ['fire', 'suppress'] } }],
          },
        },
        size: 100,
      });

      const dispatchedActions = actionsResponse.hits.hits.map(
        (hit) => hit._source as Record<string, unknown>
      );

      expect(dispatchedActions).toHaveLength(10);

      const fireActions = dispatchedActions.filter((a) => a.action_type === 'fire');
      const suppressActions = dispatchedActions.filter((a) => a.action_type === 'suppress');
      expect(fireActions).toHaveLength(6);
      expect(suppressActions).toHaveLength(4);

      // rule-001: fire (ack then unack cancels suppression)
      expect(dispatchedActions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-001',
            group_hash: 'rule-001-series-1',
            action_type: 'fire',
            actor: 'system',
            source: 'internal',
          }),
        ])
      );

      // rule-002: suppress (ack with no unack)
      expect(dispatchedActions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-002',
            group_hash: 'rule-002-series-1',
            action_type: 'suppress',
          }),
        ])
      );

      // rule-003: all fire (no user actions)
      expect(dispatchedActions).toEqual(
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
      expect(dispatchedActions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-004',
            group_hash: 'rule-004-series-1',
            action_type: 'suppress',
          }),
          expect.objectContaining({
            rule_id: 'rule-004',
            group_hash: 'rule-004-series-2',
            action_type: 'suppress',
          }),
        ])
      );

      // rule-005: series-1 suppress (deactivated), series-2 fire (no actions)
      expect(dispatchedActions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: 'rule-005',
            group_hash: 'rule-005-series-1',
            action_type: 'suppress',
          }),
          expect.objectContaining({
            rule_id: 'rule-005',
            group_hash: 'rule-005-series-2',
            action_type: 'fire',
          }),
        ])
      );
    });
  });
});

async function cleanupDataStreams(esClient: ElasticsearchClient): Promise<void> {
  await esClient
    .deleteByQuery({
      index: `${ALERT_EVENTS_DATA_STREAM},${ALERT_ACTIONS_DATA_STREAM}`,
      query: { match_all: {} },
      refresh: true,
      wait_for_completion: true,
    })
    .catch((error) => {
      // noop
    });
}

async function seedAlertEvents(esClient: ElasticsearchClient, events: AlertEvent[]): Promise<void> {
  const operations = events.flatMap((doc) => [
    { create: { _index: ALERT_EVENTS_DATA_STREAM } },
    doc,
  ]);

  await esClient.bulk({
    operations,
    refresh: true,
  });
}

const NOTIFICATION_POLICY_ID = 'np-1';

const TEST_RULE_IDS = ['rule-1', 'rule-001', 'rule-002', 'rule-003', 'rule-004', 'rule-005'];

async function seedRulesAndPolicies(
  rulesSoService: RulesSavedObjectServiceContract,
  npSoService: NotificationPolicySavedObjectServiceContract
): Promise<void> {
  const policyAttrs: NotificationPolicySavedObjectAttributes = {
    name: 'Test Policy',
    description: 'Test notification policy',
    enabled: true,
    destinations: [{ type: 'workflow' as const, id: 'test-workflow' }],
    auth: {
      apiKey: 'test-api-key',
      owner: 'elastic',
      createdByUser: false,
    },
    createdBy: null,
    updatedBy: null,
    createdAt: '2026-01-20T00:00:00.000Z',
    updatedAt: '2026-01-20T00:00:00.000Z',
  };
  await npSoService.create({ attrs: policyAttrs, id: NOTIFICATION_POLICY_ID });

  const ruleAttrs: RuleSavedObjectAttributes = {
    kind: 'alert',
    metadata: { name: 'Test Rule' },
    time_field: '@timestamp',
    schedule: { every: '5m' },
    evaluation: { query: { base: 'FROM test' } },
    enabled: true,
    createdBy: null,
    updatedBy: null,
    updatedAt: '2026-01-20T00:00:00.000Z',
    createdAt: '2026-01-20T00:00:00.000Z',
  };

  await Promise.all(
    TEST_RULE_IDS.map((ruleId) => rulesSoService.create({ attrs: ruleAttrs, id: ruleId }))
  );
}

async function seedAlertActions(
  esClient: ElasticsearchClient,
  actions: AlertAction[]
): Promise<void> {
  const operations = actions.flatMap((doc) => [
    { create: { _index: ALERT_ACTIONS_DATA_STREAM } },
    doc,
  ]);

  await esClient.bulk({
    operations,
    refresh: true,
  });
}

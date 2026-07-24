/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Verifies the fix for https://github.com/elastic/rna-program/issues/437
 *
 * The rule executor writes alert events in streaming batches with
 * `refresh: false`, so index auto-refresh can make an earlier batch searchable
 * while a later batch of the SAME execution is still unsearchable. Without a
 * guard, a dispatcher cycle running inside that window would act on a partial
 * set of episodes and later suppress the remaining ones as already-notified.
 *
 * The fix has the executor write an `execution_end_marker` document as the last
 * write of each execution, and the dispatcher only processes an execution's
 * episodes once that marker is visible. This test asserts the resulting
 * behavior: a partially-visible execution produces no notification, and once
 * the marker lands every episode is delivered together in a single dispatch.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  ALERT_ACTIONS_DATA_STREAM,
  type AlertAction,
} from '../../../resources/datastreams/alert_actions';
import {
  ALERT_EVENTS_DATA_STREAM,
  type AlertEvent,
} from '../../../resources/datastreams/alert_events';
import { getDataStreamResourceDefinitions } from '../../../resources/datastreams/register';
import type { ActionPolicySavedObjectAttributes } from '../../../saved_objects';
import { DatastreamInitializer } from '../../services/resource_service/datastream_initializer';
import { createActionPolicySavedObjectService } from '../../services/action_policy_saved_object_service/action_policy_saved_object_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { QueryService } from '../../services/query_service/query_service';
import { createRulesSavedObjectService } from '../../services/rules_saved_object_service/rules_saved_object_service.mock';
import { StorageService } from '../../services/storage_service/storage_service';
import { createRuleSoAttributes } from '../../test_utils';
import { DispatcherService } from '../dispatcher';
import { DispatcherPipeline } from '../execution_pipeline';
import {
  ApplySuppressionStep,
  ApplyThrottlingStep,
  BuildGroupsStep,
  DispatchStep,
  EvaluateMatchersStep,
  FetchEpisodesStep,
  FetchPoliciesStep,
  FetchRulesStep,
  FetchSuppressionsStep,
  StoreActionsStep,
} from '../steps';
import type { ActionPolicyWorkflowPayload } from '../types';

const RULE_ID = 'rule-437';
const POLICY_ID = 'policy-all-mode';
const WORKFLOW_ID = 'workflow-437';

const GROUP_HASH_HOST_A = 'group-hash-host-a';
const GROUP_HASH_HOST_B = 'group-hash-host-b';
const GROUP_HASH_HOST_C = 'group-hash-host-c';

function createAlertEvent(params: {
  execution: { uuid: string };
  timestamp: string;
  groupHash: string;
  host: string;
  episodeId: string;
}): AlertEvent {
  return {
    '@timestamp': params.timestamp,
    execution: params.execution,
    rule: { id: RULE_ID, version: 1 },
    group_hash: params.groupHash,
    data: { 'host.name': params.host },
    status: 'breached',
    source: 'internal',
    type: 'alert',
    episode: { id: params.episodeId, status: 'active' },
    space_id: 'default',
  };
}

function createExecutionEndMarkerEvent(params: {
  execution: { uuid: string };
  timestamp: string;
}): Partial<AlertEvent> {
  return {
    '@timestamp': params.timestamp,
    execution: params.execution,
    type: 'execution_end_marker',
  };
}

function createAllModePolicyAttributes(): ActionPolicySavedObjectAttributes {
  return {
    name: 'All-mode policy',
    description: 'Groups every matched episode into a single notification',
    enabled: true,
    destinations: [{ type: 'workflow', id: WORKFLOW_ID }],
    groupingMode: 'all',
    throttle: { strategy: 'time_interval', interval: '1h' },
    auth: { apiKey: 'test-api-key', owner: 'elastic', createdByUser: false },
    createdBy: null,
    updatedBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('dispatcher: partial visibility of a rule execution (issue #437)', () => {
  jest.setTimeout(300_000);

  let manageES: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let esClient: ElasticsearchClient;
  let storageService: StorageService;
  let dispatcherService: DispatcherService;
  let scheduleWorkflow: jest.Mock;

  beforeAll(async () => {
    // A fixed non-default port avoids colliding with dev/Scout clusters that
    // occupy the default test ES port (9220).
    const esPort = 9260;
    const { startES } = createTestServers({
      adjustTimeout: jest.setTimeout,
      settings: { es: { port: esPort } },
    });
    manageES = await startES();

    root = createRootWithCorePlugins(
      {
        elasticsearch: {
          hosts: [`http://localhost:${esPort}`],
          username: manageES.username,
          password: manageES.password,
        },
      },
      { oss: true }
    );
    await root.preboot();
    await root.setup();
    const coreStart = await root.start();
    esClient = coreStart.elasticsearch.client.asInternalUser;
  });

  afterAll(async () => {
    await root?.shutdown().catch(() => {});
    await manageES?.stop().catch(() => {});
  });

  beforeEach(async () => {
    // Reset the data streams so each test starts from empty indices — a
    // leftover `notified` record from a previous test would trip throttling.
    for (const definition of getDataStreamResourceDefinitions()) {
      await esClient.indices
        .deleteDataStream({ name: definition.dataStreamName })
        .catch(() => {});
    }
    const logger = loggingSystemMock.createLogger();
    for (const definition of getDataStreamResourceDefinitions()) {
      await new DatastreamInitializer(logger, esClient, definition).initialize();
    }

    const { loggerService } = createLoggerService();

    const queryService = new QueryService(esClient, loggerService);
    storageService = new StorageService(esClient, loggerService);

    const rulesMock = createRulesSavedObjectService();
    rulesMock.mockFindByIds.mockResolvedValue([
      { id: RULE_ID, attributes: createRuleSoAttributes(), namespaces: ['default'] },
    ]);

    const policiesMock = createActionPolicySavedObjectService();
    policiesMock.mockFindAllDecrypted.mockResolvedValue([
      { id: POLICY_ID, attributes: createAllModePolicyAttributes(), namespaces: ['default'] },
    ]);

    scheduleWorkflow = jest.fn().mockResolvedValue('workflow-execution-1');
    const workflowsManagement = {
      getWorkflow: jest.fn().mockResolvedValue({
        id: WORKFLOW_ID,
        name: 'Notify workflow',
        enabled: true,
        yaml: 'steps: []',
        definition: undefined,
      }),
      scheduleWorkflow,
    } as unknown as WorkflowsServerPluginSetup['management'];

    const pipeline = new DispatcherPipeline(loggerService, [
      new FetchEpisodesStep(queryService),
      new FetchSuppressionsStep(queryService),
      new ApplySuppressionStep(),
      new FetchRulesStep(rulesMock.rulesSavedObjectService),
      new FetchPoliciesStep(policiesMock.actionPolicySavedObjectService),
      new EvaluateMatchersStep(loggerService),
      new BuildGroupsStep(),
      new ApplyThrottlingStep(queryService, loggerService),
      new DispatchStep(loggerService, workflowsManagement),
      new StoreActionsStep(storageService),
    ]);
    dispatcherService = new DispatcherService(pipeline);
  });

  /** Writes alert events the way the rule executor does (`refresh: false`). */
  async function writeAlertEventsBatch(events: Partial<AlertEvent>[]): Promise<void> {
    const result = await storageService.bulkIndexDocs({
      index: ALERT_EVENTS_DATA_STREAM,
      docs: events,
    });
    expect(result.errors).toHaveLength(0);
  }

  async function refresh(index: string): Promise<void> {
    await esClient.indices.refresh({ index });
  }

  async function fetchActions(): Promise<AlertAction[]> {
    const response = await esClient.search<AlertAction>({
      index: ALERT_ACTIONS_DATA_STREAM,
      size: 100,
      query: { match_all: {} },
    });
    return response.hits.hits.map((hit) => hit._source!);
  }

  function dispatchedGroupHashes(): string[] {
    return scheduleWorkflow.mock.calls.flatMap((call) => {
      const { payload } = call[2] as { payload: ActionPolicyWorkflowPayload };
      return payload.episodes.map((episode) => episode.group_hash);
    });
  }

  it('delivers every episode of an execution even when the dispatcher observes the execution partially', async () => {
    const execution: { uuid: string } = { uuid: 'execution-1' };
    const now = Date.now();
    const eventTimestamp = new Date(now - 5_000).toISOString();
    const lateEventTimestamp = new Date(now - 4_000).toISOString();
    const previousStartedAt = new Date(now - 60_000);

    // The rule execution produces three alert events (one per host), written
    // in two streaming batches. Batch 1 becomes searchable via auto-refresh.
    await writeAlertEventsBatch([
      createAlertEvent({
        execution,
        timestamp: eventTimestamp,
        groupHash: GROUP_HASH_HOST_A,
        host: 'host-a',
        episodeId: 'episode-host-a',
      }),
      createAlertEvent({
        execution,
        timestamp: eventTimestamp,
        groupHash: GROUP_HASH_HOST_B,
        host: 'host-b',
        episodeId: 'episode-host-b',
      }),
    ]);
    await refresh(ALERT_EVENTS_DATA_STREAM);

    // Dispatcher cycle 1 sees E1 (host-a) and E2 (host-b) but no marker yet, so
    // the execution is treated as incomplete and nothing is dispatched.
    await dispatcherService.run({ previousStartedAt });

    expect(scheduleWorkflow).toHaveBeenCalledTimes(0);

    // The dispatcher's own writes become searchable before the next cycle.
    await refresh(ALERT_ACTIONS_DATA_STREAM);

    // Batch 2 (E3, host-c) lands, followed by the execution-end marker as the
    // last write of the execution.
    await writeAlertEventsBatch([
      createAlertEvent({
        execution,
        timestamp: lateEventTimestamp,
        groupHash: GROUP_HASH_HOST_C,
        host: 'host-c',
        episodeId: 'episode-host-c',
      }),
      createExecutionEndMarkerEvent({ execution, timestamp: lateEventTimestamp }),
    ]);
    await refresh(ALERT_EVENTS_DATA_STREAM);

    // Dispatcher cycle 2 sees the marker, so the whole execution is now
    // eligible and all three episodes are dispatched together — no episode is
    // lost to throttling from a partial notification.
    await dispatcherService.run({ previousStartedAt });

    expect(dispatchedGroupHashes().sort()).toEqual([
      GROUP_HASH_HOST_A,
      GROUP_HASH_HOST_B,
      GROUP_HASH_HOST_C,
    ]);

    await refresh(ALERT_ACTIONS_DATA_STREAM);
    const suppressActionsForHostC = (await fetchActions()).filter(
      (action) => action.action_type === 'suppress' && action.group_hash === GROUP_HASH_HOST_C
    );
    expect(suppressActionsForHostC).toHaveLength(0);
  });
});

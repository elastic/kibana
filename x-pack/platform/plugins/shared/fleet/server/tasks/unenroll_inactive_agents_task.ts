/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  CoreSetup,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { AGENTS_PREFIX, AGENT_POLICY_SAVED_OBJECT_TYPE } from '../constants';
import {
  AGENT_ACTIONS_INDEX,
  SO_SEARCH_LIMIT,
  SCHEDULED_UNENROLL_ACTION_ID_PREFIX,
} from '../../common/constants';
import { getAgentsByKuery } from '../services/agents';
import { bulkCreateAgentActionResults } from '../services/agents/actions';
import { unenrollBatch } from '../services/agents/unenroll_action_runner';
import { agentPolicyService, appContextService, auditLoggingService } from '../services';
import type { AgentPolicy, FleetServerAgentAction } from '../types';

export const TYPE = 'fleet:unenroll-inactive-agents-task';
export const VERSION = '1.0.3';
const TITLE = 'Fleet Unenroll Inactive Agent Task';
const SCOPE = ['fleet'];
const DEFAULT_INTERVAL = '10m';
const TIMEOUT = '1m';
const UNENROLLMENT_BATCHSIZE = 1000;
const POLICIES_BATCHSIZE = 500;
export const UNENROLL_INACTIVE_AGENTS_GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour

interface UnenrollInactiveAgentsTaskConfig {
  taskInterval?: string;
  gracePeriodMs?: number;
}

interface UnenrollInactiveAgentsTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  unenrollBatchSize?: number;
  config: UnenrollInactiveAgentsTaskConfig;
}

interface UnenrollInactiveAgentsTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class UnenrollInactiveAgentsTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private unenrollBatchSize: number;
  private taskInterval: string;
  private gracePeriodMs: number;
  // Tracks action IDs already processed by the execute phase so stale action docs
  // in the append-only .fleet-actions index are not re-processed on every tick.
  // Cleared only on Kibana restart; stale docs from previous sessions get one
  // harmless no-op pass before being added to this set.
  private processedActionIds = new Set<string>();

  constructor(setupContract: UnenrollInactiveAgentsTaskSetupContract) {
    const { core, taskManager, logFactory, unenrollBatchSize, config } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.unenrollBatchSize =
      unenrollBatchSize !== undefined ? unenrollBatchSize : UNENROLLMENT_BATCHSIZE;
    this.taskInterval = config.taskInterval ?? DEFAULT_INTERVAL;
    this.gracePeriodMs = config.gracePeriodMs ?? UNENROLL_INACTIVE_AGENTS_GRACE_PERIOD_MS;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: UnenrollInactiveAgentsTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('[UnenrollInactiveAgentsTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(
      `[UnenrollInactiveAgentsTask] Started with interval of [${this.taskInterval}]`
    );

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: this.taskInterval,
        },
        state: {},
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task UnenrollInactiveAgentsTask, error: ${e.message}`, e);
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  // function marked public to allow testing
  // find inactive agents enrolled on selected policies
  // check that the time since last checkin was longer than unenroll_timeout
  public getAgentsQuery(agentPolicies: AgentPolicy[]): string {
    return `(${AGENTS_PREFIX}.policy_id:${agentPolicies
      .map((policy) => {
        // @ts-ignore-next-line
        const inactivityThreshold = Date.now() - policy.unenroll_timeout * 1000;
        return `"${policy.id}" and (${AGENTS_PREFIX}.last_checkin < ${inactivityThreshold})`;
      })
      .join(' or ')}) and ${AGENTS_PREFIX}.status: inactive`;
  }

  private endRun(msg: string = '') {
    this.logger.debug(`[UnenrollInactiveAgentsTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  // Returns a Set of agent IDs that already have an open scheduled UNENROLL action
  // (start_time in the future, created by this task) to avoid re-scheduling them.
  private async getAlreadyScheduledAgentIds(
    esClient: ElasticsearchClient,
    candidateAgentIds: string[]
  ): Promise<Set<string>> {
    if (candidateAgentIds.length === 0) return new Set();

    const now = new Date().toISOString();
    const res = await esClient.search<FleetServerAgentAction>({
      index: AGENT_ACTIONS_INDEX,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { type: 'UNENROLL' } },
            { range: { start_time: { gt: now } } },
            { terms: { agents: candidateAgentIds } },
          ],
        },
      },
      _source: ['agents', 'action_id'],
      size: this.unenrollBatchSize,
    });

    const scheduledIds = new Set<string>();
    for (const hit of res.hits.hits) {
      if (hit._source?.action_id && this.processedActionIds.has(hit._source.action_id)) continue;
      for (const agentId of hit._source?.agents ?? []) {
        scheduledIds.add(agentId);
      }
    }
    return scheduledIds;
  }

  // Schedule unenrollments for eligible inactive agents.
  // Creates UNENROLL actions with a future start_time but does not revoke API keys.
  public async scheduleUnenrollments(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract
  ) {
    this.logger.debug(
      `[UnenrollInactiveAgentsTask] Fetching agent policies with unenroll_timeout > 0`
    );
    const policiesKuery = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_managed: false AND ${AGENT_POLICY_SAVED_OBJECT_TYPE}.unenroll_timeout > 0`;
    let agentCounter = 0;

    const agentPolicyFetcher = await agentPolicyService.fetchAllAgentPolicies(soClient, {
      kuery: policiesKuery,
      perPage: POLICIES_BATCHSIZE,
      spaceId: '*',
    });
    for await (const agentPolicyPageResults of agentPolicyFetcher) {
      this.logger.debug(
        `[UnenrollInactiveAgentsTask] Found ${agentPolicyPageResults.length} agent policies with unenroll_timeout > 0`
      );
      if (!agentPolicyPageResults.length) {
        this.endRun('Found no policies to process');
        return;
      }

      const res = await getAgentsByKuery(esClient, soClient, {
        kuery: this.getAgentsQuery(agentPolicyPageResults),
        showInactive: true,
        page: 1,
        perPage: this.unenrollBatchSize,
      });
      if (!res.agents.length) {
        this.logger.debug(
          '[UnenrollInactiveAgentsTask] No inactive agents to schedule for unenrollment in agent policy batch'
        );
        continue;
      }

      // Exclude agents that are already waiting for a scheduled unenrollment
      const candidateIds = res.agents.map((a) => a.id);
      const alreadyScheduled = await this.getAlreadyScheduledAgentIds(esClient, candidateIds);
      const agentsToSchedule = res.agents.filter((a) => !alreadyScheduled.has(a.id));

      if (!agentsToSchedule.length) {
        this.logger.debug(
          '[UnenrollInactiveAgentsTask] All candidate agents already have a scheduled unenrollment'
        );
        continue;
      }

      agentCounter += agentsToSchedule.length;
      if (agentCounter > this.unenrollBatchSize) {
        this.endRun('Reached the maximum amount of agents to schedule, exiting.');
        return;
      }

      const startTime = new Date(Date.now() + this.gracePeriodMs).toISOString();
      const actionId = `${SCHEDULED_UNENROLL_ACTION_ID_PREFIX}${uuidv4()}`;

      const scheduledBatch = await unenrollBatch(soClient, esClient, agentsToSchedule, {
        force: true,
        actionId,
        startTime,
      });

      auditLoggingService.writeCustomAuditLog({
        message: `Scheduled unenrollment of ${agentsToSchedule.length} inactive agents due to unenroll_timeout option set on agent policy. Fleet action [id=${scheduledBatch.actionId}] scheduled for ${startTime}`,
      });
      this.logger.debug(
        `[UnenrollInactiveAgentsTask] Scheduled unenrollment of ${agentsToSchedule.length} inactive agents with actionId: ${scheduledBatch.actionId} for ${startTime}`
      );
    }
  }

  // Execute due scheduled unenrollments that have not been cancelled.
  public async executeDueUnenrollments(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract
  ) {
    const now = new Date().toISOString();

    // Find UNENROLL actions created by this task whose start_time has passed.
    // Already-processed action IDs are filtered in-memory via processedActionIds.
    const actionsRes = await esClient.search<FleetServerAgentAction>({
      index: AGENT_ACTIONS_INDEX,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { type: 'UNENROLL' } },
            { range: { start_time: { lte: now } } },
            { prefix: { action_id: SCHEDULED_UNENROLL_ACTION_ID_PREFIX } },
          ],
        },
      },
      size: this.unenrollBatchSize,
    });

    if (!actionsRes.hits.hits.length) {
      this.logger.debug('[UnenrollInactiveAgentsTask] No due scheduled unenrollments to execute');
      return;
    }

    // Find action IDs that have been cancelled. We match in memory rather than
    // querying on data.target_id because that field is dynamically mapped as `text`
    // and prefix/term queries on it are unreliable at runtime.
    // A date range on `@timestamp` bounds the fetch: CANCEL actions relevant to
    // scheduled unenrollments must have been created within the grace period window,
    // so anything older than grace_period + one task interval cannot match a due action.
    const cancelWindowStart = new Date(
      Date.now() - this.gracePeriodMs - 10 * 60 * 1000
    ).toISOString();
    const cancelRes = await esClient.search<FleetServerAgentAction>({
      index: AGENT_ACTIONS_INDEX,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { term: { type: 'CANCEL' } },
            { range: { '@timestamp': { gte: cancelWindowStart } } },
          ],
        },
      },
      _source: ['data.target_id'],
      size: SO_SEARCH_LIMIT,
    });

    const cancelledActionIds = new Set(
      cancelRes.hits.hits.map((h) => (h._source as any)?.data?.target_id).filter(Boolean)
    );

    for (const hit of actionsRes.hits.hits) {
      const action = hit._source;
      if (!action?.action_id || !action.agents?.length) continue;
      if (this.processedActionIds.has(action.action_id)) continue;

      if (cancelledActionIds.has(action.action_id)) {
        this.logger.debug(
          `[UnenrollInactiveAgentsTask] Skipping cancelled action ${action.action_id}`
        );
        this.processedActionIds.add(action.action_id);
        continue;
      }

      // Re-validate agents haven't already been unenrolled or re-enrolled.
      // Use getAgentsByKuery with showInactive:true so that inactive agents (whose
      // status runtime field is computed from inactivity_timeout, not unenroll_timeout)
      // are not filtered out by the default ACTIVE_AGENT_CONDITION. Filter by agent.id
      // since getAgentsById uses _filterAgents which excludes inactive agents.
      const agentIdsKuery = `${AGENTS_PREFIX}.agent.id:(${action.agents
        .map((id) => `"${id}"`)
        .join(' OR ')})`;
      const { agents: agentDocs } = await getAgentsByKuery(esClient, soClient, {
        kuery: agentIdsKuery,
        showInactive: true,
        page: 1,
        perPage: action.agents.length,
      });
      const stillInactiveAgents = agentDocs.filter((a) => a.active && !a.unenrolled_at);

      if (!stillInactiveAgents.length) {
        this.logger.debug(
          `[UnenrollInactiveAgentsTask] No eligible agents for action ${action.action_id}, skipping`
        );
        // Write results so the action resolves to COMPLETE in the activity flyout
        // rather than staying IN_PROGRESS indefinitely.
        await bulkCreateAgentActionResults(
          esClient,
          action.agents.map((agentId) => ({ agentId, actionId: action.action_id! }))
        );
        this.processedActionIds.add(action.action_id);
        continue;
      }

      await unenrollBatch(soClient, esClient, stillInactiveAgents, {
        revoke: true,
        force: true,
        actionId: action.action_id,
        skipActionCreation: true,
      });

      this.processedActionIds.add(action.action_id);

      auditLoggingService.writeCustomAuditLog({
        message: `Executed scheduled unenrollment of ${stillInactiveAgents.length} inactive agents. Fleet action [id=${action.action_id}]`,
      });
      this.logger.debug(
        `[UnenrollInactiveAgentsTask] Executed scheduled unenrollment for action ${action.action_id} on ${stillInactiveAgents.length} agents`
      );
    }
  }

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!this.wasStarted) {
      this.logger.debug('[UnenrollInactiveAgentsTask] runTask Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[UnenrollInactiveAgentsTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.debug(`[runTask()] started`);

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();

    try {
      // Execute first so agents unenrolled this tick aren't immediately re-scheduled.
      await this.executeDueUnenrollments(esClient, soClient);
      await this.scheduleUnenrollments(esClient, soClient);

      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[UnenrollInactiveAgentsTask] request aborted due to timeout: ${err}`);
        this.endRun();
        return;
      }
      this.logger.error(`[UnenrollInactiveAgentsTask] error: ${err}`);
      this.endRun('error');
    }
  };
}

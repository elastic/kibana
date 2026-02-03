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
import { getAgentsByKuery } from '../services/agents';
import { unenrollBatch } from '../services/agents/unenroll_action_runner';
import { agentPolicyService, appContextService, auditLoggingService } from '../services';
import type { AgentPolicy } from '../types';

export const TYPE = 'fleet:unenroll-inactive-agents-task';
export const VERSION = '1.0.2';
const TITLE = 'Fleet Unenroll Inactive Agent Task';
const SCOPE = ['fleet'];
const INTERVAL = '10m';
const TIMEOUT = '1m';
const UNENROLLMENT_BATCHSIZE = 1000;
const POLICIES_BATCHSIZE = 500;

interface UnenrollInactiveAgentsTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  unenrollBatchSize?: number;
}

interface UnenrollInactiveAgentsTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class UnenrollInactiveAgentsTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private unenrollBatchSize: number;

  constructor(setupContract: UnenrollInactiveAgentsTaskSetupContract) {
    const { core, taskManager, logFactory, unenrollBatchSize } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.unenrollBatchSize =
      unenrollBatchSize !== undefined ? unenrollBatchSize : UNENROLLMENT_BATCHSIZE;

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
    this.logger.info(`[UnenrollInactiveAgentsTask] Started with interval of [${INTERVAL}]`);

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: INTERVAL,
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

  public async unenrollInactiveAgents(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract
  ) {
    this.logger.debug(
      `[UnenrollInactiveAgentsTask] Fetching agent policies with unenroll_timeout > 0`
    );
    // find all agent policies that are not managed and having unenroll_timeout > 0
    // limit the search to POLICIES_BATCHSIZE at a time and loop until there are no agent policies left
    const policiesKuery = `${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_managed: false AND ${AGENT_POLICY_SAVED_OBJECT_TYPE}.unenroll_timeout > 0`;
    let agentCounter = 0;

    const agentPolicyFetcher = await agentPolicyService.fetchAllAgentPolicies(soClient, {
      kuery: policiesKuery,
      perPage: POLICIES_BATCHSIZE,
    });
    for await (const agentPolicyPageResults of agentPolicyFetcher) {
      this.logger.debug(
        `[UnenrollInactiveAgentsTask] Found "${agentPolicyPageResults.length}" agent policies with unenroll_timeout > 0`
      );
      if (!agentPolicyPageResults.length) {
        this.endRun('Found no policies to process');
        return;
      }

      // find inactive agents enrolled on above policies
      // check that the time since last checkin was longer than unenroll_timeout
      // limit batch size to UNENROLLMENT_BATCHSIZE to avoid scale issues
      const res = await getAgentsByKuery(esClient, soClient, {
        kuery: this.getAgentsQuery(agentPolicyPageResults),
        showInactive: true,
        page: 1,
        perPage: this.unenrollBatchSize,
      });
      if (!res.agents.length) {
        this.logger.debug(
          '[UnenrollInactiveAgentsTask] No inactive agents to unenroll in agent policy batch'
        );
        continue;
      }
      agentCounter += res.agents.length;
      if (agentCounter > this.unenrollBatchSize) {
        this.endRun('Reached the maximum amount of agents to unenroll, exiting.');
        return;
      }
      this.logger.debug(
        `[UnenrollInactiveAgentsTask] Found "${res.agents.length}" inactive agents to unenroll. Attempting unenrollment`
      );
      const unenrolledBatch = await unenrollBatch(soClient, esClient, res.agents, {
        revoke: true,
        force: true,
        actionId: `UnenrollInactiveAgentsTask-${uuidv4()}`,
      });
      auditLoggingService.writeCustomAuditLog({
        message: `Recurrent unenrollment of ${agentCounter} inactive agents due to unenroll_timeout option set on agent policy. Fleet action [id=${unenrolledBatch.actionId}]`,
      });
      this.logger.debug(
        `[UnenrollInactiveAgentsTask] Executed unenrollment of ${agentCounter} inactive agents with actionId: ${unenrolledBatch.actionId}`
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
      await this.unenrollInactiveAgents(esClient, soClient);

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

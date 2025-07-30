/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import {
  type CoreSetup,
  type ElasticsearchClient,
  type Logger,
  SavedObjectsClient,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory, SavedObjectsClientContract } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { agentPolicyService, appContextService } from '../services';
import { bulkUpdateAgents, fetchAllAgentsByKuery } from '../services/agents';
import type { Agent } from '../types';
import { SO_SEARCH_LIMIT } from '../constants';
import { getAgentPolicySavedObjectType } from '../services/agent_policy';

export const TYPE = 'fleet:agent-status-change-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet Agent Status Change Task';
const SCOPE = ['fleet'];
const DEFAULT_INTERVAL = '1m';
const TIMEOUT = '1m';
const AGENTS_BATCHSIZE = 10000;
const AGENT_STATUS_CHANGE_DATA_STREAM = {
  type: 'logs',
  dataset: 'elastic_agent.status_change',
  namespace: 'default',
};
const AGENT_STATUS_CHANGE_DATA_STREAM_NAME = `${AGENT_STATUS_CHANGE_DATA_STREAM.type}-${AGENT_STATUS_CHANGE_DATA_STREAM.dataset}-${AGENT_STATUS_CHANGE_DATA_STREAM.namespace}`;

interface AgentStatusChangeTaskConfig {
  taskInterval?: string;
}

interface AgentStatusChangeTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  config: AgentStatusChangeTaskConfig;
}

interface AgentStatusChangeTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class AgentStatusChangeTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private abortController?: AbortController;
  private taskInterval: string;

  constructor(setupContract: AgentStatusChangeTaskSetupContract) {
    const { core, taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.taskInterval = config.taskInterval ?? DEFAULT_INTERVAL;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              this.abortController = new AbortController();
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {
              this.abortController?.abort('Task timed out');
            },
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: AgentStatusChangeTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('[AgentStatusChangeTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(`[AgentStatusChangeTask] Started with interval of [${this.taskInterval}]`);

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
      this.logger.error(`Error scheduling task AgentStatusChangeTask, error: ${e.message}`, e);
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.info(`[AgentStatusChangeTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!appContextService.getExperimentalFeatures().enableAgentStatusAlerting) {
      this.logger.debug(
        '[AgentStatusChangeTask] Aborting runTask: agent status alerting feature is disabled'
      );
      return;
    }
    if (!this.wasStarted) {
      this.logger.debug('[AgentStatusChangeTask] runTask Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[AgentStatusChangeTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.info(`[runTask()] started`);

    const [coreStart, _startDeps] = (await core.getStartServices()) as any;
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    try {
      await this.persistAgentStatusChanges(esClient, soClient);

      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[AgentStatusChangeTask] request aborted due to timeout: ${err}`);
        this.endRun();
        return;
      }
      this.logger.error(`[AgentStatusChangeTask] error: ${err}`);
      this.endRun('error');
    }
  };

  private persistAgentStatusChanges = async (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract
  ) => {
    let agentlessPolicies: string[] | undefined;
    const agentsFetcher = await fetchAllAgentsByKuery(esClient, soClient, {
      perPage: AGENTS_BATCHSIZE,
    });
    for await (const agentPageResults of agentsFetcher) {
      if (!agentPageResults.length) {
        this.endRun('Found no agents to process');
        return;
      }

      const updateErrors = {};
      const agentsToUpdate = [];

      for (const agent of agentPageResults) {
        this.throwIfAborted();

        if (agent.status !== agent.last_known_status) {
          agentsToUpdate.push(agent);
        }
      }

      if (agentsToUpdate.length === 0) {
        continue;
      } else {
        this.logger.debug(
          `[AgentStatusChangeTask] Recording ${agentsToUpdate.length} status changes`
        );
      }

      if (!agentlessPolicies) {
        agentlessPolicies = await this.findAgentlessPolicies();
      }

      await this.bulkCreateAgentStatusChangeDocs(esClient, agentsToUpdate, agentlessPolicies);

      await bulkUpdateAgents(
        esClient,
        agentsToUpdate.map((agent: Agent) => ({
          agentId: agent.id,
          data: {
            last_known_status: agent.status,
          },
        })),
        updateErrors
      );
      if (Object.keys(updateErrors).length > 0) {
        this.logger.info(`Errors while bulk updating agents: ${JSON.stringify(updateErrors)}`);
      }
    }
  };

  private findAgentlessPolicies = async () => {
    const internalSoClientWithoutSpaceExtension =
      appContextService.getInternalUserSOClientWithoutSpaceExtension();

    const agentlessPolicies = await agentPolicyService.list(internalSoClientWithoutSpaceExtension, {
      spaceId: '*',
      perPage: SO_SEARCH_LIMIT,
      kuery: `${await getAgentPolicySavedObjectType()}.supports_agentless:true`,
      fields: ['id'],
    });
    return agentlessPolicies.items.map((policy) => policy.id);
  };

  private bulkCreateAgentStatusChangeDocs = async (
    esClient: ElasticsearchClient,
    agentsToUpdate: Agent[],
    agentlessPolicies: string[] | undefined
  ) => {
    const bulkBody = agentsToUpdate.flatMap((agent) => {
      const body = {
        '@timestamp': new Date().toISOString(),
        data_stream: AGENT_STATUS_CHANGE_DATA_STREAM,
        agent: {
          id: agent.id,
        },
        status: agent.status,
        policy_id: agent.policy_id,
        space_id: agent.namespaces,
        hostname: agent.local_metadata.host.hostname,
        agentless: (agent.policy_id && agentlessPolicies?.includes(agent.policy_id)) ?? false,
      };

      return [
        {
          create: {
            _id: uuidv4(),
          },
        },
        body,
      ];
    });

    await esClient.bulk({
      index: AGENT_STATUS_CHANGE_DATA_STREAM_NAME,
      operations: bulkBody,
      refresh: 'wait_for',
    });
  };

  private throwIfAborted() {
    if (this.abortController?.signal.aborted) {
      throw new Error('Task was aborted');
    }
  }
}

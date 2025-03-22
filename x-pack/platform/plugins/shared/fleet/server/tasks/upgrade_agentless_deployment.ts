/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, type CoreSetup, type Logger } from '@kbn/core/server';
import type { ElasticsearchClient, LoggerFactory } from '@kbn/core/server';

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  type ConcreteTaskInstance,
  type TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';

import { agentPolicyService, appContextService } from '../services';

import type { Agent, AgentPolicy } from '../types';

import { AGENTS_PREFIX } from '../constants';
import { getAgentsByKuery } from '../services/agents';
import { agentlessAgentService } from '../services/agents/agentless_agent';

export const UPGRADE_AGENTLESS_DEPLOYMENTS_TASK_TYPE = 'fleet:upgrade-agentless-deployments-task';
export const UPGRADE_AGENT_DEPLOYMENTS_TASK_VERSION = '1.0.0';
const TITLE = 'Fleet upgrade agentless deployments Task';
const TIMEOUT = '2m';
const INTERVAL = '1d';
const LOGGER_SUBJECT = '[UpgradeAgentlessDeploymentsTask]';
const BATCH_SIZE = 10;
const AGENTLESS_DEPLOYMENTS_SIZE = 40;
interface UpgradeAgentlessDeploymentsTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
}

interface UpgradeAgentlessDeploymentsTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class UpgradeAgentlessDeploymentsTask {
  private logger: Logger;
  private startedTaskRunner: boolean = false;
  public abortController = new AbortController();

  constructor(setupContract: UpgradeAgentlessDeploymentsTaskSetupContract) {
    const { core, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);

    taskManager.registerTaskDefinitions({
      [UPGRADE_AGENTLESS_DEPLOYMENTS_TASK_TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {
              this.abortController.abort(`${TITLE} timed out`);
            },
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: UpgradeAgentlessDeploymentsTaskStartContract) => {
    if (!taskManager) {
      this.logger.error(`${LOGGER_SUBJECT} Missing required service during start`);
    }

    this.startedTaskRunner = true;
    this.logger.info(`${LOGGER_SUBJECT} Started with interval of [${INTERVAL}]`);

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: UPGRADE_AGENTLESS_DEPLOYMENTS_TASK_TYPE,
        schedule: {
          interval: INTERVAL,
        },
        state: {},
        params: { version: UPGRADE_AGENT_DEPLOYMENTS_TASK_VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task ${LOGGER_SUBJECT}, error: ${e.message}`, e);
    }
  };

  private get taskId(): string {
    return `${UPGRADE_AGENTLESS_DEPLOYMENTS_TASK_TYPE}:${UPGRADE_AGENT_DEPLOYMENTS_TASK_VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.info(`${LOGGER_SUBJECT} runTask ended${msg ? ': ' + msg : ''}`);
  }

  private processInBatches = async (
    {
      agentlessPolicies,
      agents,
    }: {
      agentlessPolicies: AgentPolicy[];
      agents: Agent[];
    },
    batchSize: number,
    processFunction: (agentPolicy: AgentPolicy, agentlessAgent: Agent) => void
  ) => {
    if (!agents.length) {
      this.endRun('No agents found');
      return;
    }

    for (let i = 0; i < agentlessPolicies.length; i += batchSize) {
      const currentAgentPolicyBatch = agentlessPolicies.slice(i, i + batchSize);

      await Promise.allSettled(
        await currentAgentPolicyBatch.map(async (agentPolicy) => {
          const agentlessAgent = agents.find((agent) => agent.policy_id === agentPolicy.id);

          if (!agentlessAgent) {
            this.endRun('No active online agentless agent found');
            return;
          }

          this.logger.info(
            `${LOGGER_SUBJECT} processing agentless agent ${JSON.stringify(agentlessAgent.agent)}`
          );

          if (this.abortController.signal.aborted) {
            this.logger.info(`${LOGGER_SUBJECT} Task runner canceled!`);
            this.abortController.signal.throwIfAborted();
          }
          return processFunction(agentPolicy, agentlessAgent);
        })
      );

      if (this.abortController.signal.aborted) {
        this.logger.info(`${LOGGER_SUBJECT} Task runner canceled!`);
        this.abortController.signal.throwIfAborted();
      }
    }
  };

  private processUpgradeAgentlessDeployments = async (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClient
  ) => {
    const SAVED_OBJECT_TYPE = 'fleet-agent-policies';

    const policiesKuery = `${SAVED_OBJECT_TYPE}.supports_agentless: true`;

    try {
      const agentPolicyFetcher = await agentPolicyService.fetchAllAgentPolicies(soClient, {
        kuery: policiesKuery,
        perPage: BATCH_SIZE,
        spaceId: '*',
      });
      this.logger.info(
        `[${LOGGER_SUBJECT}] running task to upgrade agentless deployments with kuery: ${policiesKuery}`
      );

      for await (const agentlessPolicies of agentPolicyFetcher) {
        this.logger.info(
          `[${LOGGER_SUBJECT}] Found "${agentlessPolicies.length}" agentless policies`
        );

        if (!agentlessPolicies.length) {
          this.endRun('Found no agentless policies to upgrade');
          return;
        }

        // Upgrade agentless deployments
        try {
          const kuery = `(${AGENTS_PREFIX}.policy_id:${agentlessPolicies
            .map((policy) => `"${policy.id}"`)
            .join(' or ')}) and ${AGENTS_PREFIX}.status:online`;

          const res = await getAgentsByKuery(esClient, soClient, {
            kuery,
            showInactive: false,
            page: 1,
            perPage: AGENTLESS_DEPLOYMENTS_SIZE,
          });
          this.logger.info(`${LOGGER_SUBJECT} Found "${res.agents.length}" agentless agents`);
          await this.processInBatches(
            {
              agentlessPolicies,
              agents: res.agents,
            },
            BATCH_SIZE,
            this.upgradeAgentlessDeployments
          );
        } catch (e) {
          this.logger.error(`${LOGGER_SUBJECT} Failed to get agentless agents error: ${e}`);
        }

        if (this.abortController.signal.aborted) {
          this.logger.info(`${LOGGER_SUBJECT} Task runner canceled!`);
          this.abortController.signal.throwIfAborted();
        }
      }
    } catch (e) {
      this.logger.error(`${LOGGER_SUBJECT} Failed to get agentless policies error: ${e}`);
    }
    this.logger.info(`${LOGGER_SUBJECT} [runTask()] finished`);
  };

  private upgradeAgentlessDeployments = async (agentPolicy: AgentPolicy, agent: Agent) => {
    this.logger.info(`Validating if agentless policy ${agentPolicy.id} needs to be upgraded`);

    // Compare the current agent version with the latest agent version And upgrade if necessary
    if (agent.status === 'online') {
      try {
        this.logger.info(
          `${LOGGER_SUBJECT} Requesting to check version and update agentless deployment for policy ${agentPolicy.id}`
        );
        await agentlessAgentService.upgradeAgentlessDeployment(agentPolicy.id);

        this.logger.info(
          `${LOGGER_SUBJECT} Successfully sent the upgrade deployment request for ${agentPolicy.id}`
        );
      } catch (e) {
        this.logger.error(
          `${LOGGER_SUBJECT} Failed to request an agentless deployment upgrade for ${agentPolicy.id} error: ${e}`
        );
        throw e;
      }
    } else {
      this.logger.info(
        `${LOGGER_SUBJECT} No upgrade request sent for agentless policy ${agentPolicy.id} because the agent status is ${agent.status}`
      );
    }
  };

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    const cloudSetup = appContextService.getCloud();
    if (!this.startedTaskRunner) {
      this.logger.info(`${LOGGER_SUBJECT} runTask Aborted. Task not started yet`);
      return;
    }

    if (taskInstance.id !== this.taskId) {
      this.logger.info(
        `${LOGGER_SUBJECT} Outdated task version: Received [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    if (!appContextService.getExperimentalFeatures().enabledUpgradeAgentlessDeploymentsTask) {
      this.endRun('Upgrade Agentless Deployments Task is disabled');
      return;
    }

    if (cloudSetup?.isServerlessEnabled) {
      this.endRun('Upgrading Agentless deployments is only supported in cloud');
      return;
    }

    this.logger.info(`[runTask()] started`);
    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());
    await this.processUpgradeAgentlessDeployments(esClient, soClient);
  };
}

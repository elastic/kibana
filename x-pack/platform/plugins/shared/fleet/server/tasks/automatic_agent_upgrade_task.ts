/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient } from '@kbn/core/server';
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
import semverGt from 'semver/functions/gt';

import type { Agent, FleetServerAgentMetadata } from '../../common/types';

import { agentPolicyService, appContextService } from '../services';
import {
  fetchAllAgentsByKuery,
  getTotalAgentsByKuery,
  sendUpgradeAgentsActions,
} from '../services/agents';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../constants';
import { AgentStatusKueryHelper, isAgentUpgradeable } from '../../common/services';

export const TYPE = 'fleet:automatic-agent-upgrade-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet Automatic agent upgrades';
const SCOPE = ['fleet'];
const INTERVAL = '1h'; // TODO: check
const TIMEOUT = '10m'; // // TODO: check
const AGENTS_BATCHSIZE = 10000; // // TODO: check
const AGENT_POLICIES_BATCHSIZE = 500; // // TODO: check
type AgentWithDefinedVersion = Agent & { agent: FleetServerAgentMetadata };

interface AutomaticAgentUpgradeTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
}

interface AutomaticAgentUpgradeTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class AutomaticAgentUpgradeTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private abortController = new AbortController();

  constructor(setupContract: AutomaticAgentUpgradeTaskSetupContract) {
    const { core, taskManager, logFactory } = setupContract;
    this.logger = logFactory.get(this.taskId);

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            cancel: async () => {
              this.abortController.abort('Task timed out');
            },
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: AutomaticAgentUpgradeTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('[AutomaticAgentUpgradeTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(`[AutomaticAgentUpgradeTask] Started with interval of [${INTERVAL}]`);

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
      this.logger.error(`Error scheduling task AutomaticAgentUpgradeTask, error: ${e.message}`, e);
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.info(`[AutomaticAgentUpgradeTask] runTask() ended${msg ? ': ' + msg : ''}`);
  }

  private async checkAgentPoliciesForAutomaticUpgrades(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract
  ) {
    this.logger.debug(
      `[AutomaticAgentUpgradeTask] Fetching all agent policies with required_versions`
    );

    // Fetch custom agent policies with set required_versions in batches.
    const agentPolicyFetcher = await agentPolicyService.fetchAllAgentPolicies(soClient, {
      kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_managed:false AND ${AGENT_POLICY_SAVED_OBJECT_TYPE}.required_versions:*`,
      perPage: AGENT_POLICIES_BATCHSIZE,
      fields: ['id', 'required_versions'],
    });
    for await (const agentPolicyPageResults of agentPolicyFetcher) {
      this.logger.debug(
        `[AutomaticAgentUpgradeTask] Found ${agentPolicyPageResults.length} agent policies with required_versions`
      );
      if (!agentPolicyPageResults.length) {
        this.endRun('Found no agent policies to process');
        return;
      }

      // Process each agent policy individually in order to calculate agent percentages.
      for (const agentPolicy of agentPolicyPageResults) {
        this.logger.debug(
          `[AutomaticAgentUpgradeTask] Processing agent policy ${
            agentPolicy.id
          } with required_versions ${JSON.stringify(agentPolicy.required_versions)}`
        );

        // Fetch all active agents assigned to the policy in batches.
        // The total number of active agents is used to calculate the target percentage of agents for upgrade.
        const activeAgentsKuery = `policy_id:${
          agentPolicy.id
        } AND ${AgentStatusKueryHelper.buildKueryForActiveAgents()}`;
        const totalActiveAgents = await getTotalAgentsByKuery(esClient, soClient, {
          kuery: activeAgentsKuery,
        });
        if (totalActiveAgents === 0) {
          this.logger.debug(
            `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id} has no active agents`
          );
          continue;
        }
        const activeAgentsFetcher = await fetchAllAgentsByKuery(esClient, soClient, {
          kuery: activeAgentsKuery,
          perPage: AGENTS_BATCHSIZE,
        });

        // Common agents pool for all required versions (to avoid same agents being selected).
        const agentsBatch = await this.getNextAgentsBatch(activeAgentsFetcher);
        let agentsDone = agentsBatch.done;
        const agentsPool = {
          toProcess: agentsBatch.agents,
          alreadyProcessed: [] as AgentWithDefinedVersion[],
        };

        // Process each required version.
        for (const requiredVersion of agentPolicy.required_versions ?? []) {
          this.logger.debug(
            `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: checking candidate agents for upgrade (target version: ${requiredVersion.version}, percentage: ${requiredVersion.percentage})`
          );

          // Get total number of agents already or on or updating to target version.
          // This information is needed to know if the target percentage has already been reached.
          const totalOnOrUpdatingToTargetVersionKuery = `policy_id:${agentPolicy.id} AND agent.version:${requiredVersion.version} OR (status:updating AND upgrade_details.target_version:${requiredVersion.version})`;
          const totalOnOrUpdatingToTargetVersionAgents = await getTotalAgentsByKuery(
            esClient,
            soClient,
            {
              kuery: totalOnOrUpdatingToTargetVersionKuery,
            }
          );

          // Calculate how many agents should be upgraded. Continue to next required version if target is already met.
          let numberOfAgentsForUpgrade = Math.round(
            (totalActiveAgents * requiredVersion.percentage) / 100
          );
          numberOfAgentsForUpgrade -= totalOnOrUpdatingToTargetVersionAgents;
          if (numberOfAgentsForUpgrade <= 0) {
            this.logger.debug(
              `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: target percentage ${requiredVersion.percentage} already reached for version: ${requiredVersion.version})`
            );
            continue;
          }

          do {
            // Select agents for upgrade.
            const [agentsForUpgrade, remainingAgents] = agentsPool.toProcess.reduce(
              (acc, agent) => {
                const isAgentAlreadyOnOrUpdatingToTargetVersion =
                  agent.agent.version === requiredVersion.version ||
                  (agent.status === 'updating' &&
                    agent.upgrade_details?.target_version === requiredVersion.version &&
                    !AgentStatusKueryHelper.isStuckInUpdating(agent));
                const keepAgentForUpgrade =
                  acc[0].length < numberOfAgentsForUpgrade &&
                  !isAgentAlreadyOnOrUpdatingToTargetVersion &&
                  isAgentUpgradeable(agent) &&
                  semverGt(requiredVersion.version, agent.agent.version);
                acc[keepAgentForUpgrade ? 0 : 1].push(agent);
                return acc;
              },
              [[], []] as [AgentWithDefinedVersion[], AgentWithDefinedVersion[]]
            );
            // Save remaining agents for the next agents batch or the next required version.
            agentsPool.toProcess = [];
            agentsPool.alreadyProcessed.push(...remainingAgents);
            // Send bulk upgrade action for selected agents.
            if (agentsForUpgrade.length > 0) {
              this.logger.info(
                `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: sending bulk upgrade to ${requiredVersion.version} for ${agentsForUpgrade.length} agents`
              );
              await sendUpgradeAgentsActions(soClient, esClient, {
                agents: agentsForUpgrade,
                version: requiredVersion.version,
                isAutomatic: true,
              });
            }
            // Check if target percentage was met. If not, fetch more agents if possible.
            numberOfAgentsForUpgrade -= agentsForUpgrade.length;
            if (!agentsDone && numberOfAgentsForUpgrade > 0) {
              const nextBatch = await this.getNextAgentsBatch(activeAgentsFetcher);
              agentsDone = nextBatch.done;
              agentsPool.toProcess = nextBatch.agents;
            }
          } while (!agentsDone && numberOfAgentsForUpgrade > 0);

          // Reset agentsPool for next required version.
          agentsPool.toProcess = agentsPool.alreadyProcessed;
          agentsPool.alreadyProcessed = [];

          if (agentsDone && numberOfAgentsForUpgrade > 0) {
            this.logger.debug(
              `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: no candidate agents for upgrade (target version: ${requiredVersion.version}, percentage: ${requiredVersion.percentage})`
            );
          }
        }
      }
    }
  }

  private async getNextAgentsBatch(agentsFetcher: AsyncIterable<Agent[]>) {
    const agentsFetcherIter = agentsFetcher[Symbol.asyncIterator]();
    const agentsBatch = await agentsFetcherIter.next();
    const agents: Agent[] = agentsBatch.value;
    return {
      done: agentsBatch.done,
      agents: agents.filter((agent): agent is AgentWithDefinedVersion => agent.agent !== undefined),
    };
  }

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!appContextService.getExperimentalFeatures().enableAutomaticAgentUpgrades) {
      this.logger.debug(
        '[AutomaticAgentUpgradeTask] Aborting runTask: automatic upgrades feature is disabled'
      );
      return;
    }

    if (!this.wasStarted) {
      this.logger.debug('[AutomaticAgentUpgradeTask] Aborting runTask(): task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[AutomaticAgentUpgradeTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.info('[AutomaticAgentUpgradeTask] runTask() started');

    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    try {
      await this.checkAgentPoliciesForAutomaticUpgrades(esClient, soClient);
      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[AutomaticAgentUpgradeTask] Request aborted due to timeout: ${err}`);
        this.endRun();
        return;
      }
      this.logger.error(`[AutomaticAgentUpgradeTask] Error: ${err}`);
      this.endRun('error');
    }
  };
}

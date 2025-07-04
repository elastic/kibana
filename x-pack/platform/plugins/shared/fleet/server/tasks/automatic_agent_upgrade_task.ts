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
import moment from 'moment';

import { AUTO_UPGRADE_DEFAULT_RETRIES } from '../../common/constants';
import type {
  Agent,
  AgentPolicy,
  AgentTargetVersion,
  FleetServerAgentMetadata,
} from '../../common/types';

import { agentPolicyService, appContextService, licenseService } from '../services';
import {
  fetchAllAgentsByKuery,
  getAgentsByKuery,
  sendAutomaticUpgradeAgentsActions,
} from '../services/agents';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../constants';
import { AgentStatusKueryHelper, isAgentUpgradeable } from '../../common/services';

export const TYPE = 'fleet:automatic-agent-upgrade-task';
export const VERSION = '1.0.1';
const TITLE = 'Fleet Automatic agent upgrades';
const SCOPE = ['fleet'];
const DEFAULT_INTERVAL = '30m';
const TIMEOUT = '10m';
const AGENT_POLICIES_BATCHSIZE = 500;
const AGENTS_BATCHSIZE = 10000;
const MIN_AGENTS_FOR_ROLLOUT = 10;
const MIN_UPGRADE_DURATION_SECONDS = 600;
type AgentWithDefinedVersion = Agent & { agent: FleetServerAgentMetadata };

interface AutomaticAgentUpgradeTaskConfig {
  taskInterval?: string;
  retryDelays?: string[];
}

interface AutomaticAgentUpgradeTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  config: AutomaticAgentUpgradeTaskConfig;
}

interface AutomaticAgentUpgradeTaskStartContract {
  taskManager: TaskManagerStartContract;
}
interface UpgradeTargetForVersion {
  version: string;
  count: number;
  targetPercentage: number;
  alreadyUpgrading: number;
}

export class AutomaticAgentUpgradeTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private abortController = new AbortController();
  private taskInterval: string;
  private retryDelays: string[];

  constructor(setupContract: AutomaticAgentUpgradeTaskSetupContract) {
    const { core, taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.taskInterval = config.taskInterval ?? DEFAULT_INTERVAL;
    this.retryDelays = config.retryDelays ?? AUTO_UPGRADE_DEFAULT_RETRIES;

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
    this.logger.info(`[AutomaticAgentUpgradeTask] Started with interval of [${this.taskInterval}]`);

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
      this.logger.error(`Error scheduling task AutomaticAgentUpgradeTask, error: ${e.message}`, e);
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  public runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    if (!appContextService.getExperimentalFeatures().enableAutomaticAgentUpgrades) {
      this.logger.debug(
        '[AutomaticAgentUpgradeTask] Aborting runTask: automatic upgrades feature is disabled'
      );
      return;
    }
    if (!licenseService.isEnterprise()) {
      this.logger.debug(
        '[AutomaticAgentUpgradeTask] Aborting runTask: automatic upgrades feature requires at least Enterprise license'
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

  private endRun(msg: string = '') {
    this.logger.info(`[AutomaticAgentUpgradeTask] runTask() ended${msg ? ': ' + msg : ''}`);
  }

  private throwIfAborted() {
    if (this.abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
  }

  private async checkAgentPoliciesForAutomaticUpgrades(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract
  ) {
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
      for (const agentPolicy of agentPolicyPageResults) {
        this.throwIfAborted();
        await this.checkAgentPolicyForAutomaticUpgrades(esClient, soClient, agentPolicy);
      }
    }
  }

  private async checkAgentPolicyForAutomaticUpgrades(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentPolicy: AgentPolicy
  ) {
    this.logger.debug(
      `[AutomaticAgentUpgradeTask] Processing agent policy ${
        agentPolicy.id
      } with required_versions ${JSON.stringify(agentPolicy.required_versions)}`
    );

    // Get total number of active agents.
    // This is used to calculate how many agents should be selected for upgrade based on the target percentage.
    const totalActiveAgents = await this.getAgentCount(
      esClient,
      soClient,
      `policy_id:${agentPolicy.id} AND ${AgentStatusKueryHelper.buildKueryForActiveAgents()}`
    );
    if (totalActiveAgents === 0) {
      this.logger.debug(
        `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id} has no active agents`
      );
      return;
    }
    // Before processing each required version, we need to get the count of agents for each version so we know if we should round some up or down to make sure we arent overshooting the total number of agents.
    const versionAndCounts = await this.getVersionAndCounts(
      agentPolicy,
      totalActiveAgents,
      esClient,
      soClient
    );

    for (const requiredVersion of agentPolicy.required_versions ?? []) {
      await this.processRequiredVersion(
        esClient,
        soClient,
        agentPolicy,
        requiredVersion,
        versionAndCounts
      );
    }
  }
  public async getVersionAndCounts(
    agentPolicy: AgentPolicy,
    totalActiveAgents: number,
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract
  ) {
    let versionAndCounts: UpgradeTargetForVersion[] = [];
    for (const requiredVersion of agentPolicy.required_versions ?? []) {
      let numberOfAgentsForUpgrade = Math.round(
        (totalActiveAgents * requiredVersion.percentage) / 100
      );

      // Subtract the total number of agents already or on or updating to target version.
      const updatingToKuery = `(upgrade_details.target_version:${requiredVersion.version} AND NOT upgrade_details.state:UPG_FAILED)`;
      const totalOnOrUpdatingToTargetVersionAgents = await this.getAgentCount(
        esClient,
        soClient,
        `((policy_id:${agentPolicy.id} AND agent.version:${
          requiredVersion.version
        }) OR ${updatingToKuery}) AND ${AgentStatusKueryHelper.buildKueryForActiveAgents()}`
      );

      numberOfAgentsForUpgrade -= totalOnOrUpdatingToTargetVersionAgents;
      versionAndCounts.push({
        version: requiredVersion.version,
        count: numberOfAgentsForUpgrade,
        targetPercentage: requiredVersion.percentage,
        alreadyUpgrading: totalOnOrUpdatingToTargetVersionAgents,
      });
    }
    // Then we need to make adjustments based on the total to make sure we arent over or undershooting the total number of agents
    versionAndCounts = await this.adjustAgentCounts(versionAndCounts, totalActiveAgents);
    return versionAndCounts;
  }
  public async adjustAgentCounts(
    versionAndCounts: UpgradeTargetForVersion[],
    totalActiveAgents: number
  ) {
    //  Calculate what we actually have vs what we need to have.
    //  First we need to get the total actual percentage if we actually added the new agents and considering the existing ones
    const totalActualPercentage =
      ((versionAndCounts.reduce((acc, item) => acc + item.count, 0) +
        versionAndCounts.reduce((acc, item) => acc + item.alreadyUpgrading, 0)) /
        totalActiveAgents) *
      100;
    const totalNeededPercentage = versionAndCounts.reduce(
      (acc, item) => acc + item.targetPercentage,
      0
    );

    // Now we have the total percentage after we add everything up, vs the total target percentage we have. Get the difference, then multiply that by the total active agents to get the delta we need to add or remove from the total count.
    const totalDeltaPercentage = totalActualPercentage - totalNeededPercentage;

    // If we are over, we need to remove some from the count, and if we are under, we need to add some to the count. If we're spot on, all good.
    if (totalDeltaPercentage !== 0) {
      // get the actual count of agents we are off by using the percentage * the total active agents
      let deltaCount = Math.round((totalDeltaPercentage / 100) * totalActiveAgents);

      // Now we need to add or remove from the versionAndCounts array
      let index = 0;
      // So long as we have more to add or remove, do so
      while (deltaCount !== 0 && index < versionAndCounts.length) {
        const item = versionAndCounts[index];
        if (deltaCount > 0) {
          // Still have too many, removing one
          item.count -= 1;
          deltaCount -= 1;
        } else if (deltaCount < 0) {
          // Still have too few, adding one
          if (item.count > 0) {
            item.count += 1;
            deltaCount += 1;
          }
        }
        index++;
      }
    }

    return versionAndCounts;
  }

  private async getAgentCount(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    kuery: string
  ) {
    const res = await getAgentsByKuery(esClient, soClient, {
      showInactive: false,
      perPage: 0,
      kuery,
    });
    return res.total;
  }

  private async processRequiredVersion(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentPolicy: AgentPolicy,
    requiredVersion: AgentTargetVersion,
    versionAndCounts: UpgradeTargetForVersion[]
  ) {
    this.logger.debug(
      `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: checking candidate agents for upgrade (target version: ${requiredVersion.version}, percentage: ${requiredVersion.percentage})`
    );

    let numberOfAgentsForUpgrade =
      versionAndCounts.find((item) => item.version === requiredVersion.version)?.count ?? 0;
    // Return if target is already met.
    if (numberOfAgentsForUpgrade <= 0) {
      this.logger.info(
        `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: target percentage ${requiredVersion.percentage} already reached for version: ${requiredVersion.version})`
      );
      return;
    }

    // Handle retries.
    const numberOfRetriedAgents = await this.processRetries(
      esClient,
      soClient,
      agentPolicy,
      requiredVersion.version
    );

    numberOfAgentsForUpgrade -= numberOfRetriedAgents;
    if (numberOfAgentsForUpgrade <= 0) {
      this.logger.debug(
        `[AutomaticAgentUpgradeTask] Number of agents ${numberOfAgentsForUpgrade}: no candidate agents found for upgrade (target version: ${requiredVersion.version}, percentage: ${requiredVersion.percentage})`
      );
      return;
    }

    // Fetch candidate agents assigned to the policy in batches.
    // NB: ideally, we would query active agents on or below the target version. Unfortunately, this is not possible because agent.version
    //     is stored as text, so semver comparison cannot be done in the ES query (cf. https://github.com/elastic/kibana/issues/168604).
    //     As an imperfect alternative, sort agents by version. Since versions sort alphabetically, this will not always result in ascending semver sorting.
    const statusKuery =
      '(status:online OR status:offline OR status:enrolling OR status:degraded OR status:error OR status:orphaned)'; // active status except updating
    const oldStuckInUpdatingKuery = `(NOT upgrade_details:* AND status:updating AND NOT upgraded_at:* AND upgrade_started_at < now-2h)`; // agents pre 8.12.0 (without upgrade_details)
    const newStuckInUpdatingKuery = `(upgrade_details.target_version:${requiredVersion.version} AND upgrade_details.state:UPG_FAILED)`;
    const agentsFetcher = await fetchAllAgentsByKuery(esClient, soClient, {
      kuery: `policy_id:${agentPolicy.id} AND (NOT upgrade_attempts:*) AND (${statusKuery} OR ${oldStuckInUpdatingKuery} OR ${newStuckInUpdatingKuery})`,
      perPage: AGENTS_BATCHSIZE,
      sortField: 'agent.version',
      sortOrder: 'asc',
    });

    let { done, agents } = await this.getNextAgentsBatch(agentsFetcher);
    if (agents.length === 0) {
      this.logger.debug(
        `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: no candidate agents found for upgrade (target version: ${requiredVersion.version}, percentage: ${requiredVersion.percentage})`
      );
      return;
    }
    let shouldProcessAgents = true;

    while (shouldProcessAgents) {
      this.throwIfAborted();
      numberOfAgentsForUpgrade = await this.findAndUpgradeCandidateAgents(
        esClient,
        soClient,
        agentPolicy,
        numberOfAgentsForUpgrade,
        requiredVersion.version,
        agents
      );
      if (!done && numberOfAgentsForUpgrade > 0) {
        ({ done, agents } = await this.getNextAgentsBatch(agentsFetcher));
        if (done) {
          shouldProcessAgents = false;
        }
      } else {
        shouldProcessAgents = false;
      }
    }

    if (numberOfAgentsForUpgrade > 0) {
      this.logger.info(
        `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: not enough agents eligible for upgrade (target version: ${requiredVersion.version}, percentage: ${requiredVersion.percentage})`
      );
    }
  }

  private async processRetries(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentPolicy: AgentPolicy,
    version: string
  ) {
    let retriedAgentsCounter = 0;

    const retryingAgentsFetcher = await fetchAllAgentsByKuery(esClient, soClient, {
      kuery: `policy_id:${agentPolicy.id} AND upgrade_details.target_version:${version} AND upgrade_details.state:UPG_FAILED AND upgrade_attempts:*`,
      perPage: AGENTS_BATCHSIZE,
      sortField: 'agent.version',
      sortOrder: 'asc',
    });

    for await (const retryingAgentsPageResults of retryingAgentsFetcher) {
      this.throwIfAborted();
      // This function will return the total number of agents marked for retry so they're included in the count of agents for upgrade.
      retriedAgentsCounter += retryingAgentsPageResults.length;

      const agentsReadyForRetry = retryingAgentsPageResults.filter((agent) =>
        this.isAgentReadyForRetry(agent, agentPolicy)
      );
      if (agentsReadyForRetry.length > 0) {
        this.logger.info(
          `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: retrying upgrade to ${version} for ${agentsReadyForRetry.length} agents`
        );

        await sendAutomaticUpgradeAgentsActions(soClient, esClient, {
          agents: agentsReadyForRetry,
          version,
          ...this.getUpgradeDurationSeconds(agentsReadyForRetry.length),
        });
      }
    }

    return retriedAgentsCounter;
  }

  private isAgentReadyForRetry(agent: Agent, agentPolicy: AgentPolicy) {
    if (!agent.upgrade_attempts) {
      return false;
    }
    if (agent.upgrade_attempts.length > this.retryDelays.length) {
      this.logger.debug(
        `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: max retry attempts exceeded for agent ${agent.id}`
      );
      return false;
    }
    const currentRetryDelay = moment
      .duration('PT' + this.retryDelays[agent.upgrade_attempts.length - 1].toUpperCase()) // https://momentjs.com/docs/#/durations/
      .asMilliseconds();
    const lastUpgradeAttempt = Date.parse(agent.upgrade_attempts[0]);
    return Date.now() - lastUpgradeAttempt >= currentRetryDelay;
  }

  private async getNextAgentsBatch(agentsFetcher: AsyncIterable<Agent[]>) {
    const agentsFetcherIter = agentsFetcher[Symbol.asyncIterator]();
    const agentsBatch = await agentsFetcherIter.next();
    const agents: Agent[] = agentsBatch.value ?? [];
    return {
      done: agentsBatch.done,
      agents: agents.filter((agent): agent is AgentWithDefinedVersion => agent.agent !== undefined),
    };
  }

  private async findAndUpgradeCandidateAgents(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentPolicy: AgentPolicy,
    numberOfAgentsForUpgrade: number,
    version: string,
    agents: AgentWithDefinedVersion[]
  ) {
    const agentsForUpgrade: AgentWithDefinedVersion[] = [];

    for (const agent of agents) {
      if (agentsForUpgrade.length >= numberOfAgentsForUpgrade) {
        break;
      }
      if (this.isAgentEligibleForUpgrade(agent, version)) {
        agentsForUpgrade.push(agent);
      }
    }

    // Send bulk upgrade action for selected agents.
    if (agentsForUpgrade.length > 0) {
      this.logger.info(
        `[AutomaticAgentUpgradeTask] Agent policy ${agentPolicy.id}: sending bulk upgrade to ${version} for ${agentsForUpgrade.length} agents`
      );
      await sendAutomaticUpgradeAgentsActions(soClient, esClient, {
        agents: agentsForUpgrade,
        version,
        ...this.getUpgradeDurationSeconds(agentsForUpgrade.length),
      });
    }

    return numberOfAgentsForUpgrade - agentsForUpgrade.length;
  }

  private isAgentEligibleForUpgrade(agent: AgentWithDefinedVersion, version: string) {
    return isAgentUpgradeable(agent) && semverGt(version, agent.agent.version);
  }

  private getUpgradeDurationSeconds(nAgents: number) {
    if (nAgents < MIN_AGENTS_FOR_ROLLOUT) {
      return {};
    }
    const upgradeDurationSeconds = Math.max(
      MIN_UPGRADE_DURATION_SECONDS,
      Math.round(nAgents * 0.03)
    );
    return { upgradeDurationSeconds };
  }
}

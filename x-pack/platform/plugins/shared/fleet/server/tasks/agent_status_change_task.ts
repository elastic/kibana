/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { type CoreSetup, type ElasticsearchClient, type Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory, SavedObjectsClientContract } from '@kbn/core/server';
import { errors, type estypes } from '@elastic/elasticsearch';

import {
  AGENT_STATUS_CHANGE_DATA_STREAM,
  AGENT_STATUS_CHANGE_DATA_STREAM_NAME,
} from '../../common/constants/agent';
import { agentPolicyService, appContextService } from '../services';
import { bulkUpdateAgents, fetchAllAgentsByKuery } from '../services/agents';
import type { Agent } from '../types';

import { throwIfAborted } from './utils';

export const TYPE = 'fleet:agent-status-change-task';
export const VERSION = '1.0.2';
const TITLE = 'Fleet Agent Status Change Task';
const SCOPE = ['fleet'];
const DEFAULT_INTERVAL = '1m';
const TIMEOUT = '1m';
const AGENTS_BATCHSIZE = 10000;

// Graceful stop so a mass status-change event doesn't run past the 1m task timeout.
// Remaining agents still match `hasChanged:true` and are picked up on the next run.
// Enforced after each page is fully processed, so up to AGENTS_BATCHSIZE agents over the cap.
const MAX_AGENTS_PER_RUN = 50000;

export const HAS_CHANGED_RUNTIME_FIELD: estypes.SearchRequest['runtime_mappings'] = {
  hasChanged: {
    type: 'boolean',
    script: {
      lang: 'painless',
      source:
        "emit(doc['last_known_status'].size() == 0 || doc['status'].size() == 0 || doc['last_known_status'].value != doc['status'].value );",
    },
  },
};

export const AGENT_STATUS_CHANGE_SOURCE_FIELDS = [
  'policy_id',
  'namespaces',
  'local_metadata.host.hostname',
];

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
  private taskInterval: string;

  constructor(setupContract: AgentStatusChangeTaskSetupContract) {
    const { core, taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.taskInterval = config.taskInterval ?? DEFAULT_INTERVAL;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({
          taskInstance,
          signal,
        }: {
          taskInstance: ConcreteTaskInstance;
          signal: AbortSignal;
        }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core, signal);
            },
            cancel: async () => {},
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
    this.logger.debug(`[AgentStatusChangeTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  public runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    signal: AbortSignal
  ) => {
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

    this.logger.debug(`[runTask()] started`);

    const [coreStart, _startDeps] = (await core.getStartServices()) as any;
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
    try {
      const processed = await this.persistAgentStatusChanges(esClient, soClient, signal);

      this.logger.debug(`[AgentStatusChangeTask] processed ${processed} agents`);
      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[AgentStatusChangeTask] request aborted: ${err}`);
        this.endRun();
        return;
      }
      this.logger.error(`[AgentStatusChangeTask] error: ${err}`);
      this.endRun('error');
    }
  };

  private persistAgentStatusChanges = async (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    signal: AbortSignal
  ): Promise<number> => {
    let policiesInfo:
      | { agentlessPolicies: string[]; policyNamespaceMap: Map<string, string> }
      | undefined;
    let processedCount = 0;
    const agentsFetcher = await fetchAllAgentsByKuery(esClient, soClient, {
      perPage: AGENTS_BATCHSIZE,
      kuery: 'hasChanged:true',
      runtimeFields: HAS_CHANGED_RUNTIME_FIELD,
      // `id` comes from `hit._id` and `status` from `hit.fields.status`; these are the only
      // `_source` fields read by `bulkCreateAgentStatusChangeDocs` and `bulkUpdateAgents`.
      _source: AGENT_STATUS_CHANGE_SOURCE_FIELDS,
      fetchFields: ['status'],
    });
    for await (const agentPageResults of agentsFetcher) {
      if (!agentPageResults.length) {
        this.endRun('Found no agents to process');
        return processedCount;
      }

      throwIfAborted(signal);

      const agentsWithStatus = agentPageResults.filter((agent) => !!agent.status);
      const skippedCount = agentPageResults.length - agentsWithStatus.length;
      if (skippedCount > 0) {
        this.logger.warn(
          `[AgentStatusChangeTask] Skipped ${skippedCount} agent(s) with no status on this page`
        );
      }

      if (agentsWithStatus.length === 0) {
        continue;
      }

      this.logger.debug(
        `[AgentStatusChangeTask] Recording ${agentsWithStatus.length} status changes`
      );

      if (!policiesInfo) {
        policiesInfo = await this.findAgentPoliciesInfo();
      }

      await this.bulkCreateAgentStatusChangeDocs(
        esClient,
        agentsWithStatus,
        policiesInfo.agentlessPolicies,
        policiesInfo.policyNamespaceMap
      );

      const updateErrors: Record<string, Error> = {};
      await bulkUpdateAgents(
        esClient,
        agentsWithStatus.map((agent: Agent) => ({
          agentId: agent.id,
          data: {
            last_known_status: agent.status,
          },
        })),
        updateErrors
      );
      const errorKeys = Object.keys(updateErrors);
      if (errorKeys.length > 0) {
        const sample = errorKeys.slice(0, 5).map((k) => ({ [k]: updateErrors[k] }));
        this.logger.warn(
          `[AgentStatusChangeTask] ${errorKeys.length} bulk update error(s): ${JSON.stringify(
            sample
          )}`
        );
      }

      processedCount += agentsWithStatus.length;
      if (processedCount >= MAX_AGENTS_PER_RUN) {
        this.logger.info(
          `[AgentStatusChangeTask] Reached per-run cap of ${MAX_AGENTS_PER_RUN} agents (processed ${processedCount}); remaining agents will be processed on the next run`
        );
        break;
      }
    }
    return processedCount;
  };

  private findAgentPoliciesInfo = async () => {
    const internalSoClientWithoutSpaceExtension =
      appContextService.getInternalUserSOClientWithoutSpaceExtension();

    const agentPolicyFetcher = await agentPolicyService.fetchAllAgentPolicies(
      internalSoClientWithoutSpaceExtension,
      {
        spaceId: '*',
        fields: ['id', 'namespace', 'supports_agentless'],
      }
    );

    const agentlessPolicies: string[] = [];
    const policyNamespaceMap = new Map<string, string>();

    for await (const batch of agentPolicyFetcher) {
      for (const policy of batch) {
        if (policy.supports_agentless) {
          agentlessPolicies.push(policy.id);
        }
        if (policy.id && policy.namespace) {
          if (!policyNamespaceMap.has(policy.id)) {
            policyNamespaceMap.set(policy.id, policy.namespace);
          }
        }
      }
    }

    return { agentlessPolicies, policyNamespaceMap };
  };

  private bulkCreateAgentStatusChangeDocs = async (
    esClient: ElasticsearchClient,
    agentsToUpdate: Agent[],
    agentlessPolicies: string[] | undefined,
    policyNamespaceMap: Map<string, string> | undefined
  ) => {
    const bulkBody = agentsToUpdate.flatMap((agent) => {
      // Use policy_base_id (always the plain UUID) for map lookups so that agents whose
      // policy_id carries a version suffix (e.g. "<uuid>#9.6") are still matched against
      // the maps that are keyed by base id. Falls back to policy_id for agents enrolled by
      // an older fleet-server that did not yet write policy_base_id.
      const basePolicyId = agent.policy_base_id ?? agent.policy_id;
      const policyNamespace = (basePolicyId && policyNamespaceMap?.get(basePolicyId)) || 'default';
      const body = {
        '@timestamp': new Date().toISOString(),
        data_stream: AGENT_STATUS_CHANGE_DATA_STREAM,
        agent: {
          id: agent.id,
        },
        status: agent.status,
        policy_id: agent.policy_id,
        policy_namespace: policyNamespace,
        space_id: agent.namespaces,
        hostname: agent.local_metadata?.host?.hostname,
        agentless: (basePolicyId && agentlessPolicies?.includes(basePolicyId)) ?? false,
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
    });
  };
}

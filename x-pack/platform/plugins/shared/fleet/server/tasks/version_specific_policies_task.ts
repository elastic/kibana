/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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

import pMap from 'p-map';

import { uniq } from 'lodash';

import { agentPolicyService, appContextService } from '../services';
import { getAgentsByKuery } from '../services/agents';

import { MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS, SO_SEARCH_LIMIT } from '../constants';
import { getAgentPolicySavedObjectType } from '../services/agent_policy';

import { throwIfAborted } from './utils';

export const TYPE = 'fleet:version-specific-policies-task';
export const VERSION = '0.0.2';
const TITLE = 'Version Specific Policies Task';
const SCOPE = ['fleet'];
const DEFAULT_INTERVAL = '30s';
const TIMEOUT = '1m';

interface VersionSpecificPoliciesTaskConfig {
  taskInterval?: string;
}

interface VersionSpecificPoliciesTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  config: VersionSpecificPoliciesTaskConfig;
}

interface VersionSpecificPoliciesTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class VersionSpecificPoliciesTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private taskInterval: string;

  constructor(setupContract: VersionSpecificPoliciesTaskSetupContract) {
    const { core, taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(this.taskId);
    this.taskInterval = config.taskInterval ?? DEFAULT_INTERVAL;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TIMEOUT,
        createTaskRunner: ({
          taskInstance,
          abortController,
        }: {
          taskInstance: ConcreteTaskInstance;
          abortController: AbortController;
        }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core, abortController);
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: VersionSpecificPoliciesTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('[VersionSpecificPoliciesTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(
      `[VersionSpecificPoliciesTask] Started with interval of [${this.taskInterval}]`
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
      this.logger.error(
        `Error scheduling task VersionSpecificPoliciesTask, error: ${e.message}`,
        e
      );
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.debug(`[VersionSpecificPoliciesTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  public runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    abortController: AbortController
  ) => {
    if (!appContextService.getExperimentalFeatures().enableAgentStatusAlerting) {
      this.logger.debug(
        '[VersionSpecificPoliciesTask] Aborting runTask: agent status alerting feature is disabled'
      );
      return;
    }
    if (!this.wasStarted) {
      this.logger.debug('[VersionSpecificPoliciesTask] runTask Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[VersionSpecificPoliciesTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.debug(`[runTask()] started`);

    const [coreStart, _startDeps] = (await core.getStartServices()) as any;
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = new SavedObjectsClient(coreStart.savedObjects.createInternalRepository());

    try {
      await this.handleVersionSpecificPolicies(esClient, soClient, abortController);

      this.endRun('success');
    } catch (err) {
      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(`[VersionSpecificPoliciesTask] request aborted due to timeout: ${err}`);
        this.endRun();
        return;
      }
      this.logger.error(`[VersionSpecificPoliciesTask] error: ${err}`);
      this.endRun('error');
    }
  };

  private handleVersionSpecificPolicies = async (
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    abortController: AbortController
  ) => {
    const agentPoliciesWithVersionConditions = await agentPolicyService.list(soClient, {
      spaceId: '*',
      perPage: SO_SEARCH_LIMIT,
      kuery: `${await getAgentPolicySavedObjectType()}.has_agent_version_conditions:true`,
      fields: ['id', 'revision'],
    });

    if (agentPoliciesWithVersionConditions.total === 0) {
      return;
    }
    throwIfAborted(abortController);

    // TODO kuery could be too long if many policies, need to page through
    const policyIdsKuery = agentPoliciesWithVersionConditions.items
      .map(
        (policy) =>
          `(policy_id:"${policy.id}" OR (policy_id:${policy.id}* AND policy_revision_idx<${policy.revision}))`
      )
      .join(' OR ');

    // reassigned agents won't be found on the next run
    // do we need date filters?
    const { aggregations } = await getAgentsByKuery(esClient, soClient, {
      kuery: `${policyIdsKuery}`, // `enrolled_at>now-1m OR upgraded_at>now-1m`,
      showInactive: false,
      perPage: 0,
      aggregations: {
        policy: {
          terms: { field: 'policy_id', size: 1000 },
          aggs: {
            version: {
              terms: {
                field: 'agent.version',
                size: 1000,
              },
            },
          },
        },
      },
    });

    throwIfAborted(abortController);

    const policiesVersions = (aggregations?.policy as any).buckets?.reduce(
      (acc: any[], bucket: any) => {
        const versions = bucket.version.buckets.map(
          (versionBucket: any) => versionBucket.key as string
        );
        const minorVersions = uniq(
          versions.map((version: string) => version.split('.').slice(0, 2).join('.'))
        );
        acc.push({ policyId: bucket.key as string, versions: minorVersions });
        return acc;
      },
      []
    );
    if (policiesVersions.length > 0) {
      appContextService
        .getLogger()
        .debug(
          `Deploying version specific policies to agents with versions: ${JSON.stringify(
            policiesVersions,
            null,
            2
          )}`
        );
    }

    await pMap(
      policiesVersions,
      async (policyVersion: { policyId: string; versions: string[] }) => {
        throwIfAborted(abortController);

        await agentPolicyService.deployPolicies(soClient, [policyVersion.policyId], undefined, {
          agentVersions: policyVersion.versions,
        });
      },
      {
        concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS,
      }
    );
  };
}

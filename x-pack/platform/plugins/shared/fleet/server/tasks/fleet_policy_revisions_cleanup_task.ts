/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type ElasticsearchClient, type Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { getDeleteTaskRunResult } from '@kbn/task-manager-plugin/server/task';
import type { LoggerFactory } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

import { AGENTS_INDEX, AGENT_POLICY_INDEX } from '../../common';
import { appContextService } from '../services';

export const TYPE = 'fleet:policy-revisions-cleanup-task';
export const VERSION = '1.0.0';
const TITLE = 'Fleet Policy Revisions Cleanup Task';
const SCOPE = ['fleet'];
const TASK_TIMEOUT = '5m';
const MAX_DOCS = 5000;

interface FleetPolicyRevisionsCleanupTaskConfig {
  max_revisions?: number;
  frequency?: string;
  max_policies_per_run?: number;
}

interface FleetPolicyRevisionsCleanupTaskSetupContract {
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
  logFactory: LoggerFactory;
  config: FleetPolicyRevisionsCleanupTaskConfig;
}

interface FleetPolicyRevisionsCleanupTaskStartContract {
  taskManager: TaskManagerStartContract;
}

type PoliciesRevisionSummaries = Record<
  string,
  {
    maxRevision: number;
    minUsedRevision?: number;
    count: number;
  }
>;

interface RevisionsToDeleteParams {
  policyId: string;
  revisionIdxCutoff: number;
}

interface Context {
  abortController: AbortController;
  pitId: string;
}

export class FleetPolicyRevisionsCleanupTask {
  private logger: Logger;
  private wasStarted: boolean = false;
  private taskInterval: string;
  private maxRevisions: number;
  private maxPoliciesPerRun: number;

  constructor(setupContract: FleetPolicyRevisionsCleanupTaskSetupContract) {
    const { core, taskManager, logFactory, config } = setupContract;
    this.logger = logFactory.get(this.taskId);

    this.taskInterval = config.frequency ?? '1h';
    this.maxRevisions = config.max_revisions ?? 10;
    this.maxPoliciesPerRun = config.max_policies_per_run ?? 100;

    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: TITLE,
        timeout: TASK_TIMEOUT,
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

  public start = async ({ taskManager }: FleetPolicyRevisionsCleanupTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('[FleetPolicyRevisionsCleanupTask] Missing required service during start');
      return;
    }

    this.wasStarted = true;
    this.logger.info(
      `[FleetPolicyRevisionsCleanupTask] Started with interval of [${this.taskInterval}], max_revisions: ${this.maxRevisions}, max_policies_per_run: ${this.maxPoliciesPerRun}`
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
        `Error scheduling task FleetPolicyRevisionsCleanupTask, error: ${e.message}`,
        e
      );
    }
  };

  private get taskId(): string {
    return `${TYPE}:${VERSION}`;
  }

  private endRun(msg: string = '') {
    this.logger.debug(`[FleetPolicyRevisionsCleanupTask] runTask ended${msg ? ': ' + msg : ''}`);
  }

  public runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    abortController: AbortController
  ) => {
    // Check if the feature flag is enabled
    if (!appContextService.getExperimentalFeatures().fleetPolicyRevisionsCleanupTask) {
      this.logger.debug(
        '[FleetPolicyRevisionsCleanupTask] Aborting runTask: fleet policy revision cleanup task feature is disabled'
      );
      return;
    }

    if (!this.wasStarted) {
      this.logger.debug('[FleetPolicyRevisionsCleanupTask] runTask Aborted. Task not started yet');
      return;
    }

    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      this.logger.debug(
        `[FleetPolicyRevisionsCleanupTask] Outdated task version: Got [${taskInstance.id}] from task instance. Current version is [${this.taskId}]`
      );
      return getDeleteTaskRunResult();
    }

    this.logger.debug(`[FleetPolicyRevisionsCleanupTask] runTask() started`);

    const [coreStart, _startDeps] = (await core.getStartServices()) as any;
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    let pitId: string | null = null;

    try {
      const pitRes = await esClient.openPointInTime({
        index: AGENT_POLICY_INDEX,
        keep_alive: TASK_TIMEOUT,
      });

      pitId = pitRes.id;

      await this.cleanupPolicyRevisions(esClient, { abortController, pitId: pitId! });

      if (pitId) {
        await esClient.closePointInTime({ id: pitId });
      }

      this.endRun('success');
    } catch (err) {
      if (pitId) {
        await esClient.closePointInTime({ id: pitId });
      }

      if (err instanceof errors.RequestAbortedError) {
        this.logger.warn(
          `[FleetPolicyRevisionsCleanupTask] request aborted due to timeout: ${err}`
        );
        this.endRun();
        return;
      }
      this.logger.error(`[FleetPolicyRevisionsCleanupTask] error: ${err}`);
      this.endRun('error');
    }
  };

  private cleanupPolicyRevisions = async (
    esClient: ElasticsearchClient,
    context: { abortController: AbortController; pitId: string }
  ) => {
    this.logger.debug(
      `[FleetPolicyRevisionsCleanupTask] Starting cleanup with max_revisions: ${this.maxRevisions}, max_policies_per_run: ${this.maxPoliciesPerRun}`
    );

    const policiesToClean = await this.getPoliciesToClean(esClient, context);

    if (Object.keys(policiesToClean).length === 0) {
      this.logger.info(
        `[FleetPolicyRevisionsCleanupTask] No policies found with more than ${this.maxRevisions} revisions. Exiting cleanup task.`
      );

      return;
    }

    this.logger.info(
      `[FleetPolicyRevisionsCleanupTask] Found ${
        Object.keys(policiesToClean).length
      } policies with more than ${this.maxRevisions} revisions.`
    );

    this.throwIfAborted(context.abortController);

    const policiesRevisionSummaries = await this.populateMinimumRevisionsUsedByAgents(
      esClient,
      policiesToClean,
      context
    );

    this.throwIfAborted(context.abortController);

    const docCount = Object.values(policiesRevisionSummaries).reduce(
      (sum, summary) => sum + summary.count,
      0
    );

    this.logger.debug(
      `[FleetPolicyRevisionsCleanupTask] Attempting to delete a maximum of ${MAX_DOCS} out of ${docCount} policy revision documents.`
    );

    await this.deletePolicyRevisions(esClient, policiesRevisionSummaries, context);

    this.logger.debug('[FleetPolicyRevisionsCleanupTask] Cleanup completed');
  };

  private getPoliciesToClean = async (
    esClient: ElasticsearchClient,
    context: { pitId: string; abortController: AbortController }
  ) => {
    const results = await this.queryMaxRevisionsAndCounts(esClient, context);

    return (
      results.aggregations?.latest_revisions_by_policy_id.buckets.reduce<PoliciesRevisionSummaries>(
        (acc, bucket) => {
          if (bucket.doc_count > this.maxRevisions) {
            acc[bucket.key] = {
              maxRevision: bucket.latest_revision.value,
              count: bucket.doc_count,
            };
          }
          return acc;
        },
        {}
      ) ?? {}
    );
  };

  private queryMaxRevisionsAndCounts = async (esClient: ElasticsearchClient, context: Context) => {
    interface Aggregations {
      latest_revisions_by_policy_id: {
        buckets: Array<{
          key: string;
          doc_count: number;
          latest_revision: {
            value: number;
          };
        }>;
      };
    }

    return await esClient.search<{}, Aggregations>(
      {
        index: AGENT_POLICY_INDEX,
        pit: {
          id: context.pitId,
          keep_alive: TASK_TIMEOUT,
        },
        size: 0,
        aggs: {
          latest_revisions_by_policy_id: {
            terms: {
              field: 'policy_id',
              order: { _count: 'desc' },
              size: this.maxPoliciesPerRun,
            },
            aggs: {
              latest_revision: {
                max: {
                  field: 'revision_idx',
                },
              },
            },
          },
        },
      },
      { signal: context.abortController.signal }
    );
  };

  private populateMinimumRevisionsUsedByAgents = async (
    esClient: ElasticsearchClient,
    policiesRevisionSummaries: PoliciesRevisionSummaries,
    context: Context
  ) => {
    const result = await this.queryMinimumRevisionsUsedByAgents(
      esClient,
      Object.keys(policiesRevisionSummaries),
      context
    );

    result.aggregations?.min_used_revisions_by_policy_id.buckets.forEach((bucket) => {
      const policySummary = policiesRevisionSummaries[bucket.key];
      if (policySummary) {
        policySummary.minUsedRevision = bucket.min_used_revision.value;
      }
    });

    return policiesRevisionSummaries;
  };

  private queryMinimumRevisionsUsedByAgents = async (
    esClient: ElasticsearchClient,
    policyIds: string[],
    context: Context
  ) => {
    interface Aggregations {
      min_used_revisions_by_policy_id: {
        buckets: Array<{
          key: string;
          doc_count: number;
          min_used_revision: {
            value: number;
          };
        }>;
      };
    }

    return await esClient.search<{}, Aggregations>(
      {
        index: AGENTS_INDEX,
        pit: {
          id: context.pitId,
          keep_alive: TASK_TIMEOUT,
        },
        size: 0,
        query: {
          terms: {
            policy_id: policyIds,
          },
        },
        aggs: {
          min_used_revisions_by_policy_id: {
            terms: {
              field: 'policy_id',
              size: this.maxPoliciesPerRun,
            },
            aggs: {
              min_used_revision: {
                min: {
                  field: 'policy_revision_idx',
                },
              },
            },
          },
        },
      },
      { signal: context.abortController.signal }
    );
  };

  private deletePolicyRevisions = async (
    esClient: ElasticsearchClient,
    policiesRevisionSummaries: PoliciesRevisionSummaries,
    context: Context
  ) => {
    const policiesToDelete = Object.entries(policiesRevisionSummaries).reduce<
      RevisionsToDeleteParams[]
    >((acc, [policyId, summary]) => {
      const minUsedRevisionIdxCutoff = summary.minUsedRevision
        ? Math.max(summary.minUsedRevision - this.maxRevisions, 1)
        : undefined;

      // If we have a minimum used revision, but the max policy offset is less than or equal to 1, nothing to delete
      if (minUsedRevisionIdxCutoff === 1) {
        return acc;
      }

      // Favor a cutoff offset based on the min revision used by agents, otherwise use the max idx
      const revisionIdxCutoff = minUsedRevisionIdxCutoff ?? summary.maxRevision - this.maxRevisions;
      return [...acc, { policyId, revisionIdxCutoff }];
    }, []);

    return await this.queryDeletePolicyRevisions(esClient, policiesToDelete, context);
  };

  private queryDeletePolicyRevisions = async (
    esClient: ElasticsearchClient,
    policiesToDelete: Array<RevisionsToDeleteParams>,
    context: Context
  ) => {
    const policyCutoffClauses = policiesToDelete.map(({ policyId, revisionIdxCutoff }) => ({
      bool: {
        must: [
          { term: { policy_id: policyId } },
          { range: { revision_idx: { lt: revisionIdxCutoff } } },
        ],
      },
    }));

    return await esClient.deleteByQuery(
      {
        index: AGENT_POLICY_INDEX,
        max_docs: MAX_DOCS,
        conflicts: 'proceed',
        scroll: TASK_TIMEOUT,
        scroll_size: 1000,
        wait_for_completion: true,
        query: {
          bool: {
            should: policyCutoffClauses,
          },
        },
      },
      { signal: context.abortController.signal }
    );
  };
  private throwIfAborted(abortController: AbortController) {
    if (abortController.signal.aborted) {
      throw new Error('Task was aborted');
    }
  }
}

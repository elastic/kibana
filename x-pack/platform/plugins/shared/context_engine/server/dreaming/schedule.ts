/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import {
  ExecutionType,
  NonTerminalExecutionStatuses,
  type ExecutionStatusUnion,
} from '@kbn/workflows';
import {
  CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
  CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
  CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID,
  CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { ContextEngineDreamingWorkflowTemplateValues } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  DEFAULT_DREAMING_INTERVAL,
  MIN_DREAMING_INTERVAL_MINUTES,
  dreamingBuildsAnything,
  dreamingTypesOf,
  type AiIndexDreamingConfig,
  type DreamingLastRun,
  type RunAiIndexDreamingResponse,
} from '../../common/dreaming';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { parseIntervalMinutes } from '../../common/validation';
import type { AiIndexService } from '../ai_indices/service';
import type { WorkflowEnablementApi } from '../feedback_analysis/schedule';
import { DreamingNotSetUpError } from './dreaming_not_set_up_error';
import { DreamingRunNothingStartedError } from './dreaming_run_nothing_started_error';
import { managedWorkflowIdSuffixFor } from '../utils/managed_workflow_suffix';

export interface DreamingWorkflowExecutionSummary {
  id: string;
  status: ExecutionStatusUnion;
  startedAt: string;
}

/** The workflows management API dreaming uses. */
export interface DreamingWorkflowsApi extends WorkflowEnablementApi {
  cancelAllActiveWorkflowExecutions(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void>;
  getWorkflowExecutions(
    params: {
      workflowId: string;
      request: KibanaRequest;
      executionTypes?: ExecutionType[];
      statuses?: ExecutionStatusUnion[];
      sortField?: string;
      sortOrder?: 'asc' | 'desc';
      size?: number;
      omitStepRuns?: boolean;
    },
    spaceId: string
  ): Promise<{ results: DreamingWorkflowExecutionSummary[] }>;
}

const CANCELLED_RUN_RETRIES = 5;
const CANCELLED_RUN_RETRY_MS = 1000;

const isRunInProgressError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('running executions');

export interface DreamingScheduleService {
  /**
   * Installs and enables the dreaming and trace dreaming workflows of an AI index that dreams,
   * and removes them from one that does not.
   */
  reconcile(params: {
    aiIndex: AiIndexItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<void>;
  /** Removes both dreaming workflows of an AI index. */
  remove(params: { aiIndexId: string; spaceId: string; request: KibanaRequest }): Promise<void>;
  /** Latest run across the attached dreaming workflows, or omitted when unknown. */
  getLastRun(params: {
    aiIndex: AiIndexItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<DreamingLastRun | undefined>;
  /** Runs the attached dreaming workflows now. */
  run(params: {
    aiIndex: AiIndexItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<RunAiIndexDreamingResponse>;
}

/** The id of the dreaming workflow of an AI index. */
export const dreamingWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_DREAMING_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** The id of the trace dreaming workflow of an AI index. */
export const traceDreamingWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** The id of the workflow trace dreaming runs each batch of an AI index with. */
export const traceDreamingBatchWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(
    aiIndexId,
    spaceId
  )}`;

/** The id of the workflow that links the facts and entities of an AI index. */
export const relationshipsWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** Whether an AI index has dreaming on and configured to build something. */
export const shouldDream = ({ dreaming }: { dreaming?: AiIndexDreamingConfig }): boolean =>
  dreaming?.enabled === true && dreamingBuildsAnything(dreaming);

/** The dreaming workflow template values for an AI index. */
export const dreamingTemplateValuesFor = (
  aiIndex: AiIndexItem,
  dreaming: AiIndexDreamingConfig,
  spaceId: string
): ContextEngineDreamingWorkflowTemplateValues => {
  const { facts, entities, relationships } = dreamingTypesOf(dreaming);
  return {
    aiIndexId: aiIndex.id,
    instanceKey: managedWorkflowIdSuffixFor(aiIndex.id, spaceId),
    memoriesIndex: aiIndex.dest.value,
    intervalMinutes:
      parseIntervalMinutes(dreaming.schedule?.interval ?? DEFAULT_DREAMING_INTERVAL) ??
      MIN_DREAMING_INTERVAL_MINUTES,
    connectorId: dreaming.connector_id ?? '',
    instructions: dreaming.instructions ?? '',
    factTypes: facts,
    entityTypes: entities,
    relationshipTypes: relationships,
  };
};

const DREAMING_WORKFLOWS = [
  {
    definitionId: CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
    label: 'dreaming',
    workflowIdFor: dreamingWorkflowIdFor,
    attach: true,
  },
  {
    definitionId: CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID,
    label: 'the trace dreaming batch workflow',
    workflowIdFor: traceDreamingBatchWorkflowIdFor,
    attach: false,
  },
  {
    definitionId: CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
    label: 'trace dreaming',
    workflowIdFor: traceDreamingWorkflowIdFor,
    attach: true,
  },
  {
    definitionId: CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
    label: 'relationships',
    workflowIdFor: relationshipsWorkflowIdFor,
    attach: true,
  },
] as const;

type DreamingWorkflow = (typeof DREAMING_WORKFLOWS)[number];

const MANUAL_RUN_WORKFLOWS = [
  CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
  CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
  CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
] as const;

const manualWorkflowMeta = (definitionId: (typeof MANUAL_RUN_WORKFLOWS)[number]) => {
  const entry = DREAMING_WORKFLOWS.find((workflow) => workflow.definitionId === definitionId);
  if (!entry) {
    throw new Error(`Unknown dreaming workflow definition '${definitionId}'`);
  }
  return entry;
};

const isWorkflowAlreadyRunningError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('running executions') ||
    error.message.includes('concurrency limit') ||
    error.message.includes('concurrency'));

export const createDreamingScheduleService = ({
  logger,
  getManagedWorkflowsClient,
  getWorkflowsManagement,
  getAiIndexService,
}: {
  logger: Logger;
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  /** Resolves to `undefined` without workflows management. */
  getWorkflowsManagement: () => Promise<DreamingWorkflowsApi | undefined>;
  getAiIndexService: () => AiIndexService;
}): DreamingScheduleService => {
  const log = logger.get('dreaming_schedule');

  const uninstall = async (
    workflow: DreamingWorkflow,
    aiIndexId: string,
    spaceId: string,
    request: KibanaRequest
  ) => {
    const client = await getManagedWorkflowsClient();
    const run = () =>
      client.uninstall(workflow.definitionId, {
        spaceId,
        workflowIdSuffix: managedWorkflowIdSuffixFor(aiIndexId, spaceId),
      });
    try {
      await run();
      return;
    } catch (error) {
      const workflowsManagement = await getWorkflowsManagement();
      if (!isRunInProgressError(error) || !workflowsManagement) {
        throw error;
      }
      await workflowsManagement.cancelAllActiveWorkflowExecutions(
        workflow.workflowIdFor(aiIndexId, spaceId),
        spaceId,
        request
      );
    }
    await pRetry(run, {
      retries: CANCELLED_RUN_RETRIES,
      minTimeout: CANCELLED_RUN_RETRY_MS,
      factor: 1,
      onFailedAttempt: (error) => {
        if (!isRunInProgressError(error)) {
          throw error;
        }
      },
    });
  };

  const automationFor = (workflow: DreamingWorkflow, aiIndexId: string, spaceId: string) =>
    ({ type: 'workflow', value: workflow.workflowIdFor(aiIndexId, spaceId) } as const);

  const attachedWorkflows = DREAMING_WORKFLOWS.filter((workflow) => workflow.attach);

  /** Which attached workflow backs the dreaming “last run” link and label (not necessarily the newest). */
  const LAST_RUN_DISPLAY_WORKFLOWS = [
    CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
    CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
    CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
  ].flatMap((definitionId) => {
    const workflow = attachedWorkflows.find((entry) => entry.definitionId === definitionId);
    return workflow ? [workflow] : [];
  });

  const lookupExecutions = async ({
    workflowId,
    spaceId,
    request,
    statuses,
  }: {
    workflowId: string;
    spaceId: string;
    request: KibanaRequest;
    statuses?: ExecutionStatusUnion[];
  }) => {
    const workflowsManagement = await getWorkflowsManagement();
    if (!workflowsManagement) {
      return undefined;
    }
    const productionLookup = {
      workflowId,
      request,
      executionTypes: [ExecutionType.PRODUCTION],
      sortField: 'createdAt',
      sortOrder: 'desc' as const,
      size: 1,
      omitStepRuns: true,
      ...(statuses !== undefined && { statuses }),
    };
    return workflowsManagement.getWorkflowExecutions(productionLookup, spaceId);
  };

  const startWorkflow = async ({
    definitionId,
    aiIndex,
    spaceId,
    request,
  }: {
    definitionId: (typeof MANUAL_RUN_WORKFLOWS)[number];
    aiIndex: AiIndexItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<RunAiIndexDreamingResponse['executions'][number] | { failed: string }> => {
    const workflow = manualWorkflowMeta(definitionId);
    const workflowId = workflow.workflowIdFor(aiIndex.id, spaceId);
    try {
      const client = await getManagedWorkflowsClient();
      const executionId = await client.execute(request, definitionId, {
        spaceId,
        workflowIdSuffix: managedWorkflowIdSuffixFor(aiIndex.id, spaceId),
      });
      return { workflow_id: workflowId, execution_id: executionId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isWorkflowAlreadyRunningError(error)) {
        log.debug(
          () =>
            `Dreaming workflow '${workflowId}' for AI index '${aiIndex.id}' is already running: ${message}`
        );
      } else {
        log.warn(
          `Could not start dreaming workflow '${workflowId}' for AI index '${aiIndex.id}': ${message}`
        );
      }
      return { failed: workflowId };
    }
  };

  return {
    async reconcile({ aiIndex, spaceId, request }) {
      const { id: aiIndexId, dreaming } = aiIndex;
      if (!dreaming || !shouldDream(aiIndex)) {
        for (const workflow of DREAMING_WORKFLOWS) {
          await uninstall(workflow, aiIndexId, spaceId, request);
          if (workflow.attach && !aiIndex.managed) {
            await getAiIndexService().removeAutomation(
              aiIndexId,
              spaceId,
              automationFor(workflow, aiIndexId, spaceId)
            );
          }
        }
        log.debug(() => `Removed dreaming for AI index '${aiIndexId}' in space '${spaceId}'`);
        return;
      }

      const workflowsManagement = await getWorkflowsManagement();
      if (!workflowsManagement) {
        throw new Error(
          `Cannot schedule dreaming for AI index '${aiIndexId}': the workflows management plugin is not available to enable the workflow, and installing it alone would leave it unscheduled.`
        );
      }

      const values = dreamingTemplateValuesFor(aiIndex, dreaming, spaceId);
      const client = await getManagedWorkflowsClient();
      for (const workflow of DREAMING_WORKFLOWS) {
        await client.install(workflow.definitionId, {
          spaceId,
          workflowIdSuffix: managedWorkflowIdSuffixFor(aiIndexId, spaceId),
          values,
        });

        const workflowId = workflow.workflowIdFor(aiIndexId, spaceId);
        await workflowsManagement.updateWorkflow(workflowId, { enabled: true }, spaceId, request);

        if (workflow.attach && !aiIndex.managed) {
          await getAiIndexService().addAutomation(
            aiIndexId,
            spaceId,
            automationFor(workflow, aiIndexId, spaceId)
          );
        }

        log.info(
          `Installed ${workflow.label} for AI index '${aiIndexId}' in space '${spaceId}' every ${values.intervalMinutes}m, running as the user who saved its config`
        );
      }
    },

    async remove({ aiIndexId, spaceId, request }) {
      for (const workflow of DREAMING_WORKFLOWS) {
        await uninstall(workflow, aiIndexId, spaceId, request);
      }
      log.debug(() => `Removed dreaming for deleted AI index '${aiIndexId}' in space '${spaceId}'`);
    },

    async getLastRun({ aiIndex, spaceId, request }) {
      if (!shouldDream(aiIndex)) {
        return undefined;
      }

      try {
        const lookups = await Promise.all(
          attachedWorkflows.map(async (workflow) => {
            const workflowId = workflow.workflowIdFor(aiIndex.id, spaceId);
            const [latest, active] = await Promise.all([
              lookupExecutions({ workflowId, spaceId, request }),
              lookupExecutions({
                workflowId,
                spaceId,
                request,
                statuses: [...NonTerminalExecutionStatuses],
              }),
            ]);
            if (!latest) {
              return undefined;
            }
            return {
              workflowId,
              latest: latest.results[0],
              hasActive: (active?.results.length ?? 0) > 0,
            };
          })
        );

        const candidates = lookups.filter(
          (entry): entry is NonNullable<typeof entry> =>
            entry !== undefined && entry.latest !== undefined
        );
        if (candidates.length === 0) {
          return undefined;
        }

        const displayEntry = LAST_RUN_DISPLAY_WORKFLOWS.map((workflow) =>
          workflow.workflowIdFor(aiIndex.id, spaceId)
        )
          .map((workflowId) => candidates.find((entry) => entry.workflowId === workflowId))
          .find((entry): entry is (typeof candidates)[number] => entry !== undefined);

        if (displayEntry === undefined) {
          return undefined;
        }

        const isRunning = candidates.some((entry) => entry.hasActive);

        return {
          started_at: displayEntry.latest.startedAt,
          status: displayEntry.latest.status,
          workflow_id: displayEntry.workflowId,
          execution_id: displayEntry.latest.id,
          is_running: isRunning,
        };
      } catch (error) {
        log.debug(
          () =>
            `Could not load last dreaming run for AI index '${aiIndex.id}' in space '${spaceId}': ${
              error instanceof Error ? error.message : String(error)
            }`
        );
        return undefined;
      }
    },

    async run({ aiIndex, spaceId, request }) {
      if (!shouldDream(aiIndex)) {
        throw new DreamingNotSetUpError(aiIndex.id);
      }

      const firstBatch = await Promise.allSettled([
        startWorkflow({
          definitionId: CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
          aiIndex,
          spaceId,
          request,
        }),
        startWorkflow({
          definitionId: CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
          aiIndex,
          spaceId,
          request,
        }),
      ]);
      const secondBatch = await Promise.allSettled([
        startWorkflow({
          definitionId: CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
          aiIndex,
          spaceId,
          request,
        }),
      ]);

      const executions: RunAiIndexDreamingResponse['executions'] = [];
      const failed: string[] = [];

      for (const result of [...firstBatch, ...secondBatch]) {
        if (result.status === 'rejected') {
          log.warn(
            `Dreaming manual run failed for AI index '${aiIndex.id}': ${
              result.reason instanceof Error ? result.reason.message : String(result.reason)
            }`
          );
          continue;
        }
        const value = result.value;
        if ('failed' in value) {
          failed.push(value.failed);
        } else {
          executions.push(value);
        }
      }

      if (executions.length === 0) {
        throw new DreamingRunNothingStartedError(aiIndex.id);
      }

      return { executions, failed };
    },
  };
};

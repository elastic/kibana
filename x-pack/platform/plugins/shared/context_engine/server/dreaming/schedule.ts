/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import {
  CONTEXT_ENGINE_DREAMING_WORKFLOW_ID,
  CONTEXT_ENGINE_MAINTENANCE_WORKFLOW_ID,
  CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
  CONTEXT_ENGINE_TRANSCRIPT_DREAMING_BATCH_WORKFLOW_ID,
  CONTEXT_ENGINE_TRANSCRIPT_DREAMING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type {
  ContextEngineDreamingWorkflowTemplateValues,
  ContextEngineMaintenanceWorkflowTemplateValues,
} from '@kbn/workflows/managed';
import type { WorkflowExecutionDto, WorkflowExecutionListDto } from '@kbn/workflows';
import {
  ExecutionStatus,
  ExecutionStatusValues,
  ExecutionType,
  isTerminalStatus,
} from '@kbn/workflows';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  DEFAULT_DREAMING_INTERVAL,
  MIN_DREAMING_INTERVAL_MINUTES,
  dreamingTypesOf,
  isDreamingOn,
  maintenanceConfigOf,
  type AiIndexDreamingConfig,
  type RunAiIndexDreamingResponse,
} from '../../common/dreaming';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { parseIntervalMinutes } from '../../common/validation';
import type { AiIndexService } from '../ai_indices/service';
import type { WorkflowEnablementApi } from '../feedback_analysis/schedule';
import { DreamingNotSetUpError } from './dreaming_not_set_up_error';
import { DreamingRunNothingStartedError } from './dreaming_run_nothing_started_error';
import { managedWorkflowIdSuffixFor } from '../utils/managed_workflow_suffix';

/** Params for listing workflow runs during a manual dreaming trigger. */
export interface DreamingWorkflowExecutionsQuery {
  workflowId: string;
  statuses?: ExecutionStatus[];
  executionTypes?: ExecutionType[];
  omitStepRuns?: boolean;
  size?: number;
  request: KibanaRequest;
}

/** The workflows management API dreaming uses. */
export interface DreamingWorkflowsApi extends WorkflowEnablementApi {
  cancelAllActiveWorkflowExecutions(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void>;
  getWorkflowExecutions(
    params: DreamingWorkflowExecutionsQuery,
    spaceId: string
  ): Promise<WorkflowExecutionListDto>;
  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    options: { includeOutput?: boolean; request: KibanaRequest }
  ): Promise<WorkflowExecutionDto | null>;
}

const NON_TERMINAL_EXECUTION_STATUSES = ExecutionStatusValues.filter(
  (status) => !isTerminalStatus(status)
);

const CANCELLED_RUN_RETRIES = 5;
const CANCELLED_RUN_RETRY_MS = 1000;

const isRunInProgressError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes('running executions') || error.message.includes('concurrency'));

export interface DreamingScheduleService {
  /**
   * Installs and enables the dreaming and transcript dreaming workflows of an AI index that dreams,
   * and its maintenance workflow while maintenance is on, and removes them otherwise.
   */
  reconcile(params: {
    aiIndex: AiIndexItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<void>;
  /** Removes the dreaming and maintenance workflows of an AI index. */
  remove(params: { aiIndexId: string; spaceId: string; request: KibanaRequest }): Promise<void>;
  /** Ids of attached dreaming workflows, or empty when dreaming is off. */
  getWorkflowIds(params: { aiIndex: AiIndexItem; spaceId: string }): string[];
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

/** The id of the transcript dreaming workflow of an AI index. */
export const transcriptDreamingWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_TRANSCRIPT_DREAMING_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(
    aiIndexId,
    spaceId
  )}`;

/** The id of the workflow transcript dreaming runs each batch of an AI index with. */
export const transcriptDreamingBatchWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_TRANSCRIPT_DREAMING_BATCH_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(
    aiIndexId,
    spaceId
  )}`;

/** The id of the workflow that links the facts and entities of an AI index. */
export const relationshipsWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** The id of the memory maintenance workflow of an AI index. */
export const maintenanceWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_MAINTENANCE_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** Whether an AI index has dreaming on and configured to build something. */
export const shouldDream = ({ dreaming }: { dreaming?: AiIndexDreamingConfig }): boolean =>
  isDreamingOn(dreaming);

/** Whether an AI index dreams and has memory maintenance turned on. */
export const shouldMaintain = (aiIndex: { dreaming?: AiIndexDreamingConfig }): boolean =>
  shouldDream(aiIndex) && aiIndex.dreaming?.maintenance?.enabled === true;

/** The dreaming and maintenance workflow template values for an AI index. */
export const dreamingTemplateValuesFor = (
  aiIndex: AiIndexItem,
  dreaming: AiIndexDreamingConfig,
  spaceId: string
): ContextEngineDreamingWorkflowTemplateValues & ContextEngineMaintenanceWorkflowTemplateValues => {
  const { facts, entities, relationships } = dreamingTypesOf(dreaming);
  const maintenance = maintenanceConfigOf(dreaming.maintenance);
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
    maintenanceIntervalMinutes:
      parseIntervalMinutes(maintenance.schedule.interval) ?? MIN_DREAMING_INTERVAL_MINUTES,
    maintenanceMode: maintenance.mode,
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
    definitionId: CONTEXT_ENGINE_TRANSCRIPT_DREAMING_BATCH_WORKFLOW_ID,
    label: 'the transcript dreaming batch workflow',
    workflowIdFor: transcriptDreamingBatchWorkflowIdFor,
    attach: false,
  },
  {
    definitionId: CONTEXT_ENGINE_TRANSCRIPT_DREAMING_WORKFLOW_ID,
    label: 'transcript dreaming',
    workflowIdFor: transcriptDreamingWorkflowIdFor,
    attach: true,
  },
  {
    definitionId: CONTEXT_ENGINE_RELATIONSHIPS_WORKFLOW_ID,
    label: 'relationships',
    workflowIdFor: relationshipsWorkflowIdFor,
    attach: true,
  },
] as const;

/** Maintains what the dreaming workflows write, on its own schedule, while it is turned on. */
const MAINTENANCE_WORKFLOW = {
  definitionId: CONTEXT_ENGINE_MAINTENANCE_WORKFLOW_ID,
  label: 'memory maintenance',
  workflowIdFor: maintenanceWorkflowIdFor,
  attach: true,
} as const;

type DreamingWorkflow = (typeof DREAMING_WORKFLOWS)[number] | typeof MAINTENANCE_WORKFLOW;
type AttachedDreamingWorkflow = (typeof DREAMING_WORKFLOWS)[number] & { attach: true };

const ALL_WORKFLOWS: readonly DreamingWorkflow[] = [...DREAMING_WORKFLOWS, MAINTENANCE_WORKFLOW];

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

  const attachedWorkflows = DREAMING_WORKFLOWS.filter(
    (workflow): workflow is AttachedDreamingWorkflow => workflow.attach
  );

  type StartWorkflowResult =
    | RunAiIndexDreamingResponse['executions'][number]
    | { failed: string }
    | { skipped: string };

  const classifyExecution = async ({
    executionId,
    workflowId,
    spaceId,
    request,
    workflowsManagement,
  }: {
    executionId: string;
    workflowId: string;
    spaceId: string;
    request: KibanaRequest;
    workflowsManagement: DreamingWorkflowsApi | undefined;
  }): Promise<StartWorkflowResult> => {
    if (!workflowsManagement) {
      return { workflow_id: workflowId, execution_id: executionId };
    }
    let execution: WorkflowExecutionDto | null;
    try {
      execution = await workflowsManagement.getWorkflowExecution(executionId, spaceId, {
        request,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.debug(
        () =>
          `Could not read status for dreaming execution '${executionId}' on '${workflowId}': ${message}`
      );
      return { workflow_id: workflowId, execution_id: executionId };
    }
    if (execution === null) {
      return { workflow_id: workflowId, execution_id: executionId };
    }
    if (execution.status === ExecutionStatus.SKIPPED) {
      return { skipped: workflowId };
    }
    return { workflow_id: workflowId, execution_id: executionId };
  };

  const hasActiveProductionExecution = async (
    workflowsManagement: DreamingWorkflowsApi,
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<boolean> => {
    const active = await workflowsManagement.getWorkflowExecutions(
      {
        workflowId,
        executionTypes: [ExecutionType.PRODUCTION],
        statuses: NON_TERMINAL_EXECUTION_STATUSES,
        omitStepRuns: true,
        size: 1,
        request,
      },
      spaceId
    );
    return active.results.length > 0;
  };

  const startWorkflow = async ({
    workflow,
    aiIndex,
    spaceId,
    request,
  }: {
    workflow: AttachedDreamingWorkflow;
    aiIndex: AiIndexItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<StartWorkflowResult> => {
    const workflowId = workflow.workflowIdFor(aiIndex.id, spaceId);
    try {
      const workflowsManagement = await getWorkflowsManagement();
      if (workflowsManagement) {
        try {
          if (
            await hasActiveProductionExecution(workflowsManagement, workflowId, spaceId, request)
          ) {
            return { skipped: workflowId };
          }
        } catch (precheckError) {
          const message =
            precheckError instanceof Error ? precheckError.message : String(precheckError);
          log.debug(
            () =>
              `Could not check for an active dreaming run on '${workflowId}' before starting: ${message}`
          );
        }
      }

      const client = await getManagedWorkflowsClient();
      const executionId = await client.execute(request, workflow.definitionId, {
        spaceId,
        workflowIdSuffix: managedWorkflowIdSuffixFor(aiIndex.id, spaceId),
      });
      return await classifyExecution({
        executionId,
        workflowId,
        spaceId,
        request,
        workflowsManagement,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isRunInProgressError(error)) {
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

  const detach = async (
    workflow: DreamingWorkflow,
    aiIndex: AiIndexItem,
    spaceId: string,
    request: KibanaRequest
  ) => {
    await uninstall(workflow, aiIndex.id, spaceId, request);
    if (workflow.attach && !aiIndex.managed) {
      await getAiIndexService().removeAutomation(
        aiIndex.id,
        spaceId,
        automationFor(workflow, aiIndex.id, spaceId)
      );
    }
  };

  return {
    async reconcile({ aiIndex, spaceId, request }) {
      const { id: aiIndexId, dreaming } = aiIndex;
      if (!dreaming || !shouldDream(aiIndex)) {
        for (const workflow of ALL_WORKFLOWS) {
          await detach(workflow, aiIndex, spaceId, request);
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
      const maintain = shouldMaintain(aiIndex);
      const client = await getManagedWorkflowsClient();
      for (const workflow of maintain ? ALL_WORKFLOWS : DREAMING_WORKFLOWS) {
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

        const intervalMinutes =
          workflow === MAINTENANCE_WORKFLOW
            ? values.maintenanceIntervalMinutes
            : values.intervalMinutes;
        log.info(
          `Installed ${workflow.label} for AI index '${aiIndexId}' in space '${spaceId}' every ${intervalMinutes}m, running as the user who saved its config`
        );
      }
      if (!maintain) {
        await detach(MAINTENANCE_WORKFLOW, aiIndex, spaceId, request);
      }
    },

    async remove({ aiIndexId, spaceId, request }) {
      for (const workflow of ALL_WORKFLOWS) {
        await uninstall(workflow, aiIndexId, spaceId, request);
      }
      log.debug(() => `Removed dreaming for deleted AI index '${aiIndexId}' in space '${spaceId}'`);
    },

    getWorkflowIds({ aiIndex, spaceId }) {
      if (!shouldDream(aiIndex)) {
        return [];
      }
      return attachedWorkflows.map((workflow) => workflow.workflowIdFor(aiIndex.id, spaceId));
    },

    async run({ aiIndex, spaceId, request }) {
      if (!shouldDream(aiIndex)) {
        throw new DreamingNotSetUpError(aiIndex.id);
      }

      const results = await Promise.allSettled(
        attachedWorkflows.map((workflow) => startWorkflow({ workflow, aiIndex, spaceId, request }))
      );

      const outcomes = results.flatMap((result) => {
        if (result.status === 'fulfilled') {
          return [result.value];
        }
        log.warn(
          `Dreaming manual run failed for AI index '${aiIndex.id}': ${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          }`
        );
        return [];
      });

      const failed = outcomes.flatMap((outcome) => ('failed' in outcome ? [outcome.failed] : []));
      const skipped = outcomes.flatMap((outcome) =>
        'skipped' in outcome ? [outcome.skipped] : []
      );
      const executions = outcomes.flatMap((outcome) =>
        'failed' in outcome || 'skipped' in outcome ? [] : [outcome]
      );

      if (executions.length === 0 && skipped.length === 0) {
        throw new DreamingRunNothingStartedError(aiIndex.id);
      }

      return { executions, failed, skipped };
    },
  };
};

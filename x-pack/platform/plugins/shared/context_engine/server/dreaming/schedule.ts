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
  CONTEXT_ENGINE_TRACE_DREAMING_BATCH_WORKFLOW_ID,
  CONTEXT_ENGINE_TRACE_DREAMING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { ContextEngineMaintenanceWorkflowTemplateValues } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  DEFAULT_DREAMING_INTERVAL,
  MIN_DREAMING_INTERVAL_MINUTES,
  dreamingBuildsAnything,
  dreamingTypesOf,
  maintenanceConfigOf,
  type AiIndexDreamingConfig,
} from '../../common/dreaming';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import { parseIntervalMinutes } from '../../common/validation';
import type { AiIndexService } from '../ai_indices/service';
import type { WorkflowEnablementApi } from '../feedback_analysis/schedule';

/** The workflows management API dreaming uses. */
export interface DreamingWorkflowsApi extends WorkflowEnablementApi {
  cancelAllActiveWorkflowExecutions(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void>;
}

const CANCELLED_RUN_RETRIES = 5;
const CANCELLED_RUN_RETRY_MS = 1000;

const isRunInProgressError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('running executions');
import { managedWorkflowIdSuffixFor } from '../utils/managed_workflow_suffix';

export interface DreamingScheduleService {
  /**
   * Installs and enables the dreaming and trace dreaming workflows of an AI index that dreams,
   * and its maintenance workflow while maintenance is on, and removes them otherwise.
   */
  reconcile(params: {
    aiIndex: AiIndexItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<void>;
  /** Removes the dreaming and maintenance workflows of an AI index. */
  remove(params: { aiIndexId: string; spaceId: string; request: KibanaRequest }): Promise<void>;
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

/** The id of the memory maintenance workflow of an AI index. */
export const maintenanceWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_MAINTENANCE_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** Whether an AI index has dreaming on and configured to build something. */
export const shouldDream = ({ dreaming }: { dreaming?: AiIndexDreamingConfig }): boolean =>
  dreaming?.enabled === true && dreamingBuildsAnything(dreaming);

/** Whether an AI index dreams and has memory maintenance turned on. */
export const shouldMaintain = (aiIndex: { dreaming?: AiIndexDreamingConfig }): boolean =>
  shouldDream(aiIndex) && aiIndex.dreaming?.maintenance?.enabled === true;

/** The dreaming and maintenance workflow template values for an AI index. */
export const dreamingTemplateValuesFor = (
  aiIndex: AiIndexItem,
  dreaming: AiIndexDreamingConfig,
  spaceId: string
): ContextEngineMaintenanceWorkflowTemplateValues => {
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
    maxTombstoneShare: maintenance.max_tombstone_share,
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

/** Maintains what the dreaming workflows write, on its own schedule, while it is turned on. */
const MAINTENANCE_WORKFLOW = {
  definitionId: CONTEXT_ENGINE_MAINTENANCE_WORKFLOW_ID,
  label: 'memory maintenance',
  workflowIdFor: maintenanceWorkflowIdFor,
  attach: true,
} as const;

type DreamingWorkflow = (typeof DREAMING_WORKFLOWS)[number] | typeof MAINTENANCE_WORKFLOW;

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
  };
};

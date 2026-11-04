/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import pRetry from 'p-retry';
import { CONTEXT_ENGINE_DREAMING_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { ContextEngineDreamingWorkflowTemplateValues } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  DEFAULT_DREAMING_INTERVAL,
  MIN_DREAMING_INTERVAL_MINUTES,
  dreamingBuildsAnything,
  dreamingTypesOf,
  type AiIndexDreamingConfig,
} from '../../common/dreaming';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { parseIntervalMinutes } from '../../common/validation';
import type { AiIndexService } from '../ai_indices/service';
import type { WorkflowEnablementApi } from '../feedback_analysis/schedule';

/** The workflows management calls dreaming makes, declared structurally like {@link WorkflowEnablementApi}. */
export interface DreamingWorkflowsApi extends WorkflowEnablementApi {
  cancelAllActiveWorkflowExecutions(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void>;
}

const CANCELLED_RUN_RETRIES = 5;
const CANCELLED_RUN_RETRY_MS = 1000;

/** Workflows management refuses to delete a workflow while one of its runs is in progress. */
const isRunInProgressError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('running executions');
import { managedWorkflowIdSuffixFor } from '../utils/managed_workflow_suffix';

export interface DreamingScheduleService {
  /**
   * Brings the dreaming workflow of an AI index in line with its saved config: installs it with
   * the config as its consts and enables it as the caller, or removes it when dreaming is off.
   */
  reconcile(params: {
    aiIndex: AiIndexHttpItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<void>;
  /** Removes the dreaming workflow of an AI index that was deleted. */
  remove(params: { aiIndexId: string; spaceId: string; request: KibanaRequest }): Promise<void>;
}

/** The id of the dreaming workflow Context Engine installs for an AI index. */
export const dreamingWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_DREAMING_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** Whether an AI index should have a dreaming workflow: dreaming is on and builds something. */
export const shouldDream = ({ dreaming }: { dreaming?: AiIndexDreamingConfig }): boolean =>
  dreaming?.enabled === true && dreamingBuildsAnything(dreaming);

/** The dreaming workflow's template values: the saved config, as consts. */
export const dreamingTemplateValuesFor = (
  aiIndex: AiIndexHttpItem,
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

export const createDreamingScheduleService = ({
  logger,
  getManagedWorkflowsClient,
  getWorkflowsManagement,
  getAiIndexService,
}: {
  logger: Logger;
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  /** Resolves to nothing in a deployment without workflows management, which cannot dream. */
  getWorkflowsManagement: () => Promise<DreamingWorkflowsApi | undefined>;
  getAiIndexService: () => AiIndexService;
}): DreamingScheduleService => {
  const log = logger.get('dreaming_schedule');

  /** Uninstalls the workflow, first stopping a run in progress, which blocks the uninstall. */
  const uninstall = async (aiIndexId: string, spaceId: string, request: KibanaRequest) => {
    const client = await getManagedWorkflowsClient();
    const run = () =>
      client.uninstall(CONTEXT_ENGINE_DREAMING_WORKFLOW_ID, {
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
        dreamingWorkflowIdFor(aiIndexId, spaceId),
        spaceId,
        request
      );
    }
    // Cancelling signals the run, which stops at its next step.
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

  const automationFor = (aiIndexId: string, spaceId: string) =>
    ({ type: 'workflow', value: dreamingWorkflowIdFor(aiIndexId, spaceId) } as const);

  return {
    async reconcile({ aiIndex, spaceId, request }) {
      const { id: aiIndexId, dreaming } = aiIndex;
      if (!dreaming || !shouldDream(aiIndex)) {
        await uninstall(aiIndexId, spaceId, request);
        if (!aiIndex.managed) {
          await getAiIndexService().removeAutomation(
            aiIndexId,
            spaceId,
            automationFor(aiIndexId, spaceId)
          );
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
      await client.install(CONTEXT_ENGINE_DREAMING_WORKFLOW_ID, {
        spaceId,
        workflowIdSuffix: managedWorkflowIdSuffixFor(aiIndexId, spaceId),
        values,
      });

      // Enabling registers the scheduled trigger and mints the API key the runs execute under, so
      // the schedule follows whoever last changed the config.
      const workflowId = dreamingWorkflowIdFor(aiIndexId, spaceId);
      await workflowsManagement.updateWorkflow(workflowId, { enabled: true }, spaceId, request);

      // Attached so the AI index lists it with its other automations, where it can be run and its
      // runs followed. A managed AI index takes no automations.
      if (!aiIndex.managed) {
        await getAiIndexService().addAutomation(
          aiIndexId,
          spaceId,
          automationFor(aiIndexId, spaceId)
        );
      }

      log.info(
        `Scheduled dreaming for AI index '${aiIndexId}' in space '${spaceId}' every ${values.intervalMinutes}m, running as the user who saved its config`
      );
    },

    async remove({ aiIndexId, spaceId, request }) {
      await uninstall(aiIndexId, spaceId, request);
      log.debug(() => `Removed dreaming for deleted AI index '${aiIndexId}' in space '${spaceId}'`);
    },
  };
};

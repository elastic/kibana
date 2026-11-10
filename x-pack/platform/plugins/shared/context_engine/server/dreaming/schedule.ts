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
  /** Installs and enables the dreaming workflow of an AI index, or removes it. */
  reconcile(params: {
    aiIndex: AiIndexHttpItem;
    spaceId: string;
    request: KibanaRequest;
  }): Promise<void>;
  /** Removes the dreaming workflow of an AI index. */
  remove(params: { aiIndexId: string; spaceId: string; request: KibanaRequest }): Promise<void>;
}

/** The id of the dreaming workflow of an AI index. */
export const dreamingWorkflowIdFor = (aiIndexId: string, spaceId: string): string =>
  `${CONTEXT_ENGINE_DREAMING_WORKFLOW_ID}-${managedWorkflowIdSuffixFor(aiIndexId, spaceId)}`;

/** Whether an AI index has dreaming on and configured to build something. */
export const shouldDream = ({ dreaming }: { dreaming?: AiIndexDreamingConfig }): boolean =>
  dreaming?.enabled === true && dreamingBuildsAnything(dreaming);

/** The dreaming workflow template values for an AI index. */
export const dreamingTemplateValuesFor = (
  aiIndex: AiIndexHttpItem,
  dreaming: AiIndexDreamingConfig,
  spaceId: string
): ContextEngineDreamingWorkflowTemplateValues => {
  const { facts, entities } = dreamingTypesOf(dreaming);
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
  /** Resolves to `undefined` without workflows management. */
  getWorkflowsManagement: () => Promise<DreamingWorkflowsApi | undefined>;
  getAiIndexService: () => AiIndexService;
}): DreamingScheduleService => {
  const log = logger.get('dreaming_schedule');

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

      const workflowId = dreamingWorkflowIdFor(aiIndexId, spaceId);
      await workflowsManagement.updateWorkflow(workflowId, { enabled: true }, spaceId, request);

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { STREAMS_KI_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';
import { CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';
import WORKFLOW_YAML from './continuous_extraction_workflow.yaml';
import { pollUntil } from './poll_until';

export interface ContinuousKiExtractionWorkflowService {
  ensureWorkflow(params: { enabled: boolean; request: KibanaRequest }): Promise<void>;
}

export const createContinuousKiExtractionWorkflowService = (
  logger: Logger,
  managementApi: WorkflowsServerPluginSetup['management']
): ContinuousKiExtractionWorkflowService => {
  const log = logger.get('continuous-ki-extraction-workflow');

  const getNonTerminalExecutions = async () => {
    const { results, total } = await managementApi.getWorkflowExecutions(
      {
        workflowId: CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
        statuses: [...NonTerminalExecutionStatuses],
      },
      DEFAULT_SPACE_ID
    );
    return { results, total };
  };

  const cancelChildOnboardingWorkflows = async () => {
    const { results } = await managementApi.getWorkflowExecutions(
      {
        workflowId: STREAMS_KI_ONBOARDING_WORKFLOW_ID,
        statuses: [...NonTerminalExecutionStatuses],
        omitStepRuns: true,
        size: 50,
      },
      DEFAULT_SPACE_ID
    );

    const toCancel: string[] = [];
    for (const item of results) {
      const full = await managementApi.getWorkflowExecution(item.id, DEFAULT_SPACE_ID, {
        includeOutput: true,
      });
      if (full?.context?.parentWorkflowId === CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID) {
        toCancel.push(item.id);
      }
    }

    if (toCancel.length > 0) {
      await Promise.all(
        toCancel.map((id) => managementApi.cancelWorkflowExecution(id, DEFAULT_SPACE_ID))
      );
      log.debug(
        () =>
          `Cancelled ${toCancel.length} onboarding workflow(s) triggered by continuous extraction`
      );
    }
  };

  const cancelAndAwaitTermination = async () => {
    const { results } = await getNonTerminalExecutions();
    if (results.length === 0) {
      return;
    }

    await Promise.all([
      ...results.map((result) =>
        managementApi.cancelWorkflowExecution(result.id, DEFAULT_SPACE_ID)
      ),
      cancelChildOnboardingWorkflows().catch((err) =>
        log.warn(`Failed to cancel child onboarding workflows: ${err}`)
      ),
    ]);

    log.debug(() => `Requested cancellation for ${results.length} running workflow execution(s)`);

    await pollUntil(
      () => getNonTerminalExecutions(),
      ({ total }) => total === 0
    );
  };

  const hardDelete = async (request: KibanaRequest) => {
    await cancelAndAwaitTermination().catch((err) =>
      log.warn(`Failed to cancel running workflow executions: ${err}`)
    );

    const { deleted, failures } = await managementApi.deleteWorkflows(
      [CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID],
      DEFAULT_SPACE_ID,
      request,
      { force: true }
    );

    if (deleted === 0 && failures.length > 0) {
      const reasons = failures.map((f) => `${f.id}: ${f.error}`).join('; ');
      throw new Error(
        `Failed to delete workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}: ${reasons}`
      );
    }

    log.info(`Hard-deleted workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`);
  };

  return {
    async ensureWorkflow({ enabled, request }) {
      const existing = await managementApi.getWorkflow(
        CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
        DEFAULT_SPACE_ID
      );
      const currentlyEnabled = existing?.enabled ?? false;

      if (enabled === currentlyEnabled) {
        log.debug(() => `Workflow already ${enabled ? 'enabled' : 'disabled'}, no-op`);
        return;
      }

      if (existing) {
        await hardDelete(request);
      }

      if (!enabled) {
        return;
      }

      await managementApi.createWorkflow(
        { yaml: WORKFLOW_YAML, id: CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID },
        DEFAULT_SPACE_ID,
        request
      );

      log.info(`Created continuous KI extraction workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`);
    },
  };
};

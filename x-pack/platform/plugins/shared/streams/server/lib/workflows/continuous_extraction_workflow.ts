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

import { CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';
import type { TaskClient } from '../tasks/task_client';
import { FEATURES_IDENTIFICATION_TASK_TYPE } from '../tasks/task_definitions/features_identification';
import WORKFLOW_YAML from './continuous_extraction_workflow.yaml';

export interface ContinuousKiExtractionWorkflowService {
  ensureWorkflow(params: {
    enabled: boolean;
    request: KibanaRequest;
    taskClient: TaskClient<string>;
  }): Promise<void>;
}

export const createContinuousKiExtractionWorkflowService = (
  logger: Logger,
  managementApi: WorkflowsServerPluginSetup['management']
): ContinuousKiExtractionWorkflowService => {
  const log = logger.get('continuous-ki-extraction-workflow');

  const cancelRunningExecution = async () => {
    const { results } = await managementApi.getWorkflowExecutions(
      {
        workflowId: CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
        statuses: [...NonTerminalExecutionStatuses],
        size: 1,
      },
      DEFAULT_SPACE_ID
    );

    if (results.length === 0) {
      return;
    }

    const executionId = results[0].id;
    log.info(
      `Cancelling running execution ${executionId} for workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`
    );

    await managementApi.cancelWorkflowExecution(executionId, DEFAULT_SPACE_ID);
  };

  const hardDeleteIfExists = async (request: KibanaRequest) => {
    const existing = await managementApi.getWorkflow(
      CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
      DEFAULT_SPACE_ID
    );

    if (!existing) {
      return;
    }

    try {
      await cancelRunningExecution();
    } catch (error) {
      log.warn(`Best-effort cancellation failed, proceeding with delete: ${error}`);
    }

    const result = await managementApi.deleteWorkflows(
      [CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID],
      DEFAULT_SPACE_ID,
      request,
      { force: true }
    );

    if (result.deleted === 0 && result.failures.length > 0) {
      const reasons = result.failures.map((f) => `${f.id}: ${f.error}`).join('; ');
      throw new Error(
        `Failed to delete workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}: ${reasons}`
      );
    }

    log.info(
      `Hard-deleted continuous KI extraction workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`
    );
  };

  return {
    async ensureWorkflow({ enabled, request, taskClient }) {
      await hardDeleteIfExists(request);

      if (!enabled) {
        return;
      }

      const deleted = await taskClient.deleteByType(FEATURES_IDENTIFICATION_TASK_TYPE);
      if (deleted > 0) {
        log.info(`Purged ${deleted} feature-identification task(s) for clean-slate re-extraction`);
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
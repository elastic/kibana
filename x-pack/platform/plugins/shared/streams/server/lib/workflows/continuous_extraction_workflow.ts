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
import WORKFLOW_YAML from './continuous_extraction_workflow.yaml';

export interface ContinuousKiExtractionWorkflowService {
  ensureWorkflow(params: { enabled: boolean; request: KibanaRequest }): Promise<void>;
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

  return {
    async ensureWorkflow({ enabled, request }) {
      const existing = await managementApi.getWorkflow(
        CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
        DEFAULT_SPACE_ID
      );

      if (existing) {
        const yamlChanged = existing.yaml !== WORKFLOW_YAML;
        const enabledChanged = existing.enabled !== enabled;

        if (!yamlChanged && !enabledChanged) {
          log.debug(
            `Continuous KI extraction workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID} is already up to date`
          );
          return;
        }

        if (!enabled && enabledChanged) {
          try {
            await cancelRunningExecution();
          } catch (error) {
            log.warn(`Best-effort cancellation failed, proceeding with disable: ${error}`);
          }
        }

        const patch: { yaml?: string; enabled?: boolean } = {};
        if (yamlChanged) patch.yaml = WORKFLOW_YAML;
        if (enabledChanged) patch.enabled = enabled;

        await managementApi.updateWorkflow(
          CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
          patch,
          DEFAULT_SPACE_ID,
          request
        );

        log.info(
          `Updated continuous KI extraction workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`
        );
        return;
      }

      if (!enabled) {
        return;
      }

      await managementApi.createWorkflow(
        { yaml: WORKFLOW_YAML, id: CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID },
        DEFAULT_SPACE_ID,
        request
      );

      await managementApi.updateWorkflow(
        CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
        { enabled: true },
        DEFAULT_SPACE_ID,
        request
      );

      log.info(`Created continuous KI extraction workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`);
    },
  };
};

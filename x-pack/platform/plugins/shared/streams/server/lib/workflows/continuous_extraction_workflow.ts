/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import { CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';
import WORKFLOW_YAML from './continuous_extraction_workflow.yaml';

export interface ContinuousKiExtractionWorkflowService {
  ensureWorkflow(params: {
    enabled: boolean;
    request: KibanaRequest;
    spaceId: string;
  }): Promise<void>;
}

export const createContinuousKiExtractionWorkflowService = (
  logger: Logger,
  managementApi: WorkflowsServerPluginSetup['management']
): ContinuousKiExtractionWorkflowService => {
  const log = logger.get('continuous-ki-extraction-workflow');

  return {
    async ensureWorkflow({ enabled, request, spaceId }) {
      try {
        const existing = await managementApi.getWorkflow(
          CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
          spaceId
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

          const patch: { yaml?: string; enabled?: boolean } = {};
          if (yamlChanged) patch.yaml = WORKFLOW_YAML;
          if (enabledChanged) patch.enabled = enabled;

          await managementApi.updateWorkflow(
            CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
            patch,
            spaceId,
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
          spaceId,
          request
        );

        await managementApi.updateWorkflow(
          CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
          { enabled: true },
          spaceId,
          request
        );

        log.info(
          `Created continuous KI extraction workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`
        );
      } catch (error) {
        log.error(
          `Failed to ensure continuous KI extraction workflow: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  };
};

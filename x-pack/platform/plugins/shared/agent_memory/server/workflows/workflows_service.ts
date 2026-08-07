/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MEMORY_WORKFLOW_TYPES,
  type MemoryWorkflowStatus,
  type MemoryWorkflowType,
} from '@kbn/agent-memory-common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { MEMORY_WORKFLOW_ID_BY_TYPE } from './workflow_ids';

export interface MemoryWorkflowsService {
  /** True when the workflows plugin is present; false means curation cannot run at all. */
  isAvailable(): boolean;
  listStatuses(): Promise<MemoryWorkflowStatus[]>;
  setEnabled(params: {
    types: MemoryWorkflowType[];
    enabled: boolean;
    request: KibanaRequest;
  }): Promise<Array<{ type: MemoryWorkflowType; message: string }>>;
  run(params: { type: MemoryWorkflowType; request: KibanaRequest }): Promise<string>;
}

/**
 * Wraps the managed curation workflows.
 *
 * Every method degrades rather than throwing when the workflows plugin is absent:
 * memory is still fully usable by hand and by agents without background curation,
 * so an optional dependency should not make the whole feature look broken.
 */
export const createMemoryWorkflowsService = ({
  workflowsManagement,
  spaces,
  logger,
}: {
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaces?: SpacesPluginStart;
  logger: Logger;
}): MemoryWorkflowsService => {
  const isAvailable = () => Boolean(workflowsManagement);

  const getWorkflow = async (type: MemoryWorkflowType) => {
    if (!workflowsManagement) return undefined;
    const id = MEMORY_WORKFLOW_ID_BY_TYPE[type];
    try {
      return await workflowsManagement.management.getWorkflow(id, GLOBAL_WORKFLOW_SPACE_ID);
    } catch (error) {
      logger.debug(`Could not read managed workflow "${id}": ${(error as Error).message}`);
      return undefined;
    }
  };

  return {
    isAvailable,

    async listStatuses() {
      return Promise.all(
        MEMORY_WORKFLOW_TYPES.map(async (type): Promise<MemoryWorkflowStatus> => {
          const workflow = await getWorkflow(type);
          return {
            type,
            // A document without a definition means Kibana is still installing.
            installed: Boolean(workflow?.definition),
            enabled: Boolean(workflow?.enabled),
          };
        })
      );
    },

    async setEnabled({ types, enabled, request }) {
      if (!workflowsManagement) {
        return types.map((type) => ({
          type,
          message: 'Workflows management is not available in this deployment.',
        }));
      }

      const failures: Array<{ type: MemoryWorkflowType; message: string }> = [];

      for (const type of types) {
        const workflow = await getWorkflow(type);
        if (!workflow?.definition) {
          failures.push({
            type,
            message: `Managed workflow "${MEMORY_WORKFLOW_ID_BY_TYPE[type]}" is not installed yet.`,
          });
          continue;
        }

        try {
          // `updateWorkflow` reports the resulting state rather than throwing, so
          // reconcile against what came back instead of assuming success.
          const result = await workflowsManagement.management.updateWorkflow(
            workflow.id,
            { enabled },
            GLOBAL_WORKFLOW_SPACE_ID,
            request
          );
          if (result.enabled !== enabled) {
            const detail = result.validationErrors.join('; ');
            failures.push({
              type,
              message: detail || `Could not update workflow "${workflow.id}".`,
            });
          }
        } catch (error) {
          failures.push({ type, message: (error as Error).message });
        }
      }

      return failures;
    },

    async run({ type, request }) {
      if (!workflowsManagement) {
        throw new Error('Workflows management is not available in this deployment.');
      }
      const workflow = await getWorkflow(type);
      if (!workflow?.definition) {
        throw new Error(
          `Managed workflow "${MEMORY_WORKFLOW_ID_BY_TYPE[type]}" not found. Kibana may still be starting up.`
        );
      }

      // Documents live in the global workflow space; the execution runs in the
      // caller's space so it shows up in that space's Workflows UI.
      const executionSpaceId = spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

      const executionId = await workflowsManagement.management.runWorkflow(
        { ...workflow, definition: workflow.definition },
        executionSpaceId,
        {},
        request,
        'agent-memory-ui'
      );
      logger.info(`Triggered memory workflow "${workflow.id}", executionId=${executionId}`);
      return executionId;
    },
  };
};

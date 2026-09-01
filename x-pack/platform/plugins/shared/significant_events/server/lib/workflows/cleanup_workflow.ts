/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { stateBlocksNewActivity } from '../../../common/maintenance/state_machine';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';

export interface CleanupWorkflowService {
  /**
   * Ensures the per-space managed Significant Events cleanup workflow is installed and enabled.
   *
   * Enabling schedules the workflow's trigger task under the API key minted from
   * the discovery request. Idempotent: an already-enabled workflow returns after
   * one read, while a missing workflow is installed with the space ID suffix.
   */
  ensureEnabled(params: { request: KibanaRequest; spaceId: string }): Promise<void>;
}

/** Best-effort enables the cleanup workflow when Significant Events activity is allowed. */
export const bootstrapCleanupWorkflow = async ({
  cleanupWorkflowService,
  maintenanceService,
  request,
  spaceId,
  logger,
}: {
  cleanupWorkflowService: CleanupWorkflowService | undefined;
  maintenanceService: SignificantEventsMaintenanceService;
  request: KibanaRequest;
  spaceId: string;
  logger: Pick<Logger, 'warn'>;
}): Promise<void> => {
  if (!cleanupWorkflowService) {
    return;
  }
  try {
    const state = await maintenanceService.getState({ request });
    if (stateBlocksNewActivity(state)) {
      return;
    }
    await cleanupWorkflowService.ensureEnabled({ request, spaceId });
  } catch (error) {
    logger.warn(
      `Failed to ensure Significant Events cleanup workflow is enabled: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const createCleanupWorkflowService = ({
  logger,
  managementApi,
  getManagedWorkflowsClient,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
}): CleanupWorkflowService => {
  const log = logger.get('cleanup-workflow');

  return {
    async ensureEnabled({ request, spaceId }) {
      const workflowDocumentId = `${SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID}-${spaceId}`;
      let existing = await managementApi.getWorkflow(workflowDocumentId, spaceId);

      if (!existing) {
        const managedWorkflowsClient = await getManagedWorkflowsClient();
        await managedWorkflowsClient.install(SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID, {
          spaceId,
          workflowIdSuffix: spaceId,
        });
        existing = await managementApi.getWorkflow(workflowDocumentId, spaceId);
        if (!existing) {
          log.warn(
            `Managed cleanup workflow ${workflowDocumentId} was not installed; skipping enablement`
          );
          return;
        }
      }

      if (existing.enabled ?? false) {
        return;
      }

      await managementApi.updateWorkflow(workflowDocumentId, { enabled: true }, spaceId, request);

      log.info(`Enabled Significant Events cleanup workflow in space ${spaceId}`);
    },
  };
};

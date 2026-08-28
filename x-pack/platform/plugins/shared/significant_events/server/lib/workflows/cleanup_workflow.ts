/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID } from '@kbn/workflows/managed';
import { stateBlocksNewActivity } from '../../../common/maintenance/state_machine';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';

// The cleanup workflow is installed and scheduled in the default space because
// Significant Events data is deployment-wide rather than scoped per Kibana space.
const MANAGED_WORKFLOW_SPACE_ID = DEFAULT_SPACE_ID;

export interface CleanupWorkflowService {
  /**
   * Ensures the managed Significant Events cleanup workflow is enabled.
   *
   * Enabling schedules the workflow's trigger task under the API key minted from
   * the given request (the startup install path only writes the document and
   * never schedules the trigger). Idempotent: a single `getWorkflow` read short-
   * circuits when the workflow is already enabled, so it is cheap to call from
   * the hot extraction path. Once enabled, the persisted Task Manager task keeps
   * firing on its own schedule, independent of extraction.
   */
  ensureEnabled(params: { request: KibanaRequest }): Promise<void>;
}

/** Best-effort enables the cleanup workflow when Significant Events activity is allowed. */
export const bootstrapCleanupWorkflow = async ({
  cleanupWorkflowService,
  maintenanceService,
  request,
  logger,
}: {
  cleanupWorkflowService: CleanupWorkflowService | undefined;
  maintenanceService: SignificantEventsMaintenanceService;
  request: KibanaRequest;
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
    await cleanupWorkflowService.ensureEnabled({ request });
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
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
}): CleanupWorkflowService => {
  const log = logger.get('cleanup-workflow');

  return {
    async ensureEnabled({ request }) {
      const existing = await managementApi.getWorkflow(
        SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
        MANAGED_WORKFLOW_SPACE_ID
      );

      if (!existing) {
        log.warn(
          `Managed cleanup workflow ${SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID} is not installed yet; skipping enablement`
        );
        return;
      }

      if (existing.enabled ?? false) {
        return;
      }

      await managementApi.updateWorkflow(
        SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID,
        { enabled: true },
        MANAGED_WORKFLOW_SPACE_ID,
        request
      );

      log.info(`Enabled Significant Events cleanup workflow`);
    },
  };
};

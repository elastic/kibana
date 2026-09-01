/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { stateBlocksNewActivity } from '../../../common/maintenance/state_machine';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';

export interface SyncWorkflowService {
  /** Ensures the deployment-wide KI sync workflow is enabled in the default space. */
  ensureEnabled(params: { request: KibanaRequest }): Promise<void>;
}

/** Best-effort enables KI sync when Significant Events activity is allowed. */
export const bootstrapSyncWorkflow = async ({
  syncWorkflowService,
  maintenanceService,
  request,
  logger,
}: {
  syncWorkflowService: SyncWorkflowService | undefined;
  maintenanceService: SignificantEventsMaintenanceService;
  request: KibanaRequest;
  logger: Pick<Logger, 'warn'>;
}): Promise<void> => {
  if (!syncWorkflowService) {
    return;
  }
  try {
    const state = await maintenanceService.getState({ request });
    if (stateBlocksNewActivity(state)) {
      return;
    }
    await syncWorkflowService.ensureEnabled({ request });
  } catch (error) {
    logger.warn(
      `Failed to ensure KI sync workflow is enabled: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const createSyncWorkflowService = ({
  logger,
  managementApi,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
}): SyncWorkflowService => {
  const log = logger.get('ki-sync-workflow');

  return {
    async ensureEnabled({ request }) {
      const existing = await managementApi.getWorkflow(
        SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
        DEFAULT_SPACE_ID
      );

      if (!existing) {
        log.warn(
          `Managed KI sync workflow ${SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID} is not installed yet; skipping enablement`
        );
        return;
      }

      if (existing.enabled ?? false) {
        return;
      }

      await managementApi.updateWorkflow(
        SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
        { enabled: true },
        DEFAULT_SPACE_ID,
        request
      );

      log.info('Enabled KI sync workflow');
    },
  };
};

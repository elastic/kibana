/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { STREAMS_KI_SYNC_WORKFLOW_ID } from '@kbn/workflows/managed';

// The managed sync workflow is installed and scheduled in the default space so
// its executions are stored there, matching the other KI workflows.
const MANAGED_WORKFLOW_SPACE_ID = DEFAULT_SPACE_ID;

export interface SyncWorkflowService {
  /**
   * Ensures the managed sync workflow is scheduled.
   *
   * The workflow ships disabled (its managed install only writes the document,
   * it never schedules the recurring trigger). Enabling it is what creates the
   * Task Manager task, so we enable it lazily the first time KI identification
   * runs. Once enabled the workflow stays enabled (restorable), so this is a
   * cheap no-op on every subsequent call.
   *
   * Best-effort: failures are logged and swallowed so they never block KI
   * identification. The next KI identification will retry.
   */
  ensureScheduled(params: { request: KibanaRequest }): Promise<void>;
}

export const createSyncWorkflowService = ({
  logger,
  managementApi,
}: {
  logger: Logger;
  managementApi: WorkflowsServerPluginSetup['management'];
}): SyncWorkflowService => {
  const log = logger.get('streams-ki-sync-workflow');

  return {
    async ensureScheduled({ request }) {
      try {
        const existing = await managementApi.getWorkflow(
          STREAMS_KI_SYNC_WORKFLOW_ID,
          MANAGED_WORKFLOW_SPACE_ID
        );

        // The managed install runs asynchronously at plugin start; if the
        // document is not there yet, skip — the next KI identification retries.
        if (!existing) {
          log.debug(
            () =>
              `Managed sync workflow ${STREAMS_KI_SYNC_WORKFLOW_ID} is not installed yet, skipping scheduling`
          );
          return;
        }

        if (existing.enabled === true) {
          return;
        }

        await managementApi.updateWorkflow(
          STREAMS_KI_SYNC_WORKFLOW_ID,
          { enabled: true },
          MANAGED_WORKFLOW_SPACE_ID,
          request
        );

        log.info(`Enabled and scheduled managed sync workflow ${STREAMS_KI_SYNC_WORKFLOW_ID}`);
      } catch (err) {
        log.warn(`Failed to ensure managed sync workflow is scheduled: ${err}`);
      }
    },
  };
};

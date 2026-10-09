/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID } from '@kbn/workflows/managed';

// The sync workflow is installed and scheduled in the default space, matching the
// continuous onboarding precedent (streams/KIs are global).
const MANAGED_WORKFLOW_SPACE_ID = DEFAULT_SPACE_ID;

export interface SyncWorkflowService {
  /**
   * Ensures the managed KI sync (groundedness) sweep workflow is enabled.
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
        MANAGED_WORKFLOW_SPACE_ID
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
        MANAGED_WORKFLOW_SPACE_ID,
        request
      );

      log.info(`Enabled KI sync workflow`);
    },
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  CREATE_INVESTIGATION_PROPOSAL_WORKFLOW_ID,
  RECOVER_INVESTIGATION_PROPOSAL_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER_ID } from '../../../common/constants';

/**
 * Installs the generic proposal gate globally. It has to be a managed workflow
 * because an unmanaged parent can neither execute a managed child nor see
 * globally-installed definitions.
 */
export const initializeManagedWorkflows = async ({
  workflowsExtensions,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<PluginScopedManagedWorkflowsApi> => {
  const client = await workflowsExtensions.initManagedWorkflowsClient(
    AGENTIC_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER_ID
  );

  const install = async (workflowId: string): Promise<boolean> => {
    try {
      await client.install(workflowId, { spaceId: GLOBAL_WORKFLOW_SPACE_ID });
      return true;
    } catch (error) {
      logger.error(
        `Failed to install managed workflow "${workflowId}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // The recovery companion must be installed alongside the gate it recovers;
  // a failure to install either is logged and degrades reconciliation.
  const installedCreate = await install(CREATE_INVESTIGATION_PROPOSAL_WORKFLOW_ID);
  const installedRecover = await install(RECOVER_INVESTIGATION_PROPOSAL_WORKFLOW_ID);
  const canReconcile = installedCreate && installedRecover;

  if (canReconcile) {
    try {
      await client.ready();
      logger.info('Agentic investigations managed workflows initialized');
    } catch (error) {
      logger.warn(
        `Agentic investigations managed workflow reconciliation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  } else {
    logger.warn(
      'Agentic investigations managed workflow reconciliation skipped because initialization degraded'
    );
  }

  return client;
};

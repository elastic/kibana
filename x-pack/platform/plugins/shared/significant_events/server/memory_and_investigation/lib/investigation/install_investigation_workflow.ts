/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { INVESTIGATION_WORKFLOW_ID } from '../../../lib/maintenance/managed_workflow_targets';

export const installInvestigationWorkflow = async ({
  client,
}: {
  client: PluginScopedManagedWorkflowsApi;
}): Promise<void> => {
  await client.install(INVESTIGATION_WORKFLOW_ID, {
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  });
};

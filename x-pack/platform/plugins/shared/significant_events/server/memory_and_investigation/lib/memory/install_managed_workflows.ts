/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { MEMORY_WORKFLOW_IDS } from '../../../lib/maintenance/managed_workflow_targets';

export const installMemoryWorkflows = async ({
  client,
}: {
  client: PluginScopedManagedWorkflowsApi;
}): Promise<void> => {
  const results = await Promise.allSettled(
    MEMORY_WORKFLOW_IDS.map((id) => client.install(id, { spaceId: GLOBAL_WORKFLOW_SPACE_ID }))
  );

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          `${MEMORY_WORKFLOW_IDS[index]} (${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          })`,
        ]
      : []
  );

  if (failures.length > 0) {
    throw new Error(`Failed to install memory workflows: [${failures.join('; ')}]`);
  }
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { AGENT_MEMORY_WORKFLOW_IDS } from './workflow_ids';

/**
 * Installs the curation workflows at the global workflow scope (memory is
 * space-agnostic), then marks this plugin's managed set complete.
 *
 * `ready()` triggers reconciliation, which treats any persisted document without
 * a matching install as removed-by-owner and deletes it — so when memory is
 * disabled this must return *before* reaching it, not install nothing and
 * proceed.
 */
export const installMemoryWorkflows = async ({
  client,
  isMemoryEnabled,
  logger,
}: {
  client: PluginScopedManagedWorkflowsApi;
  isMemoryEnabled: () => boolean;
  logger: Logger;
}): Promise<void> => {
  if (!isMemoryEnabled()) {
    logger.debug('Agent memory is disabled; skipping managed workflow installation.');
    return;
  }

  const results = await Promise.allSettled(
    AGENT_MEMORY_WORKFLOW_IDS.map((id) => client.install(id, { spaceId: GLOBAL_WORKFLOW_SPACE_ID }))
  );

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          `${AGENT_MEMORY_WORKFLOW_IDS[index]} (${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          })`,
        ]
      : []
  );

  if (failures.length > 0) {
    throw new Error(`Failed to install agent memory workflows: [${failures.join('; ')}]`);
  }

  await client.ready();
  logger.debug('Agent memory managed workflows installed.');
};

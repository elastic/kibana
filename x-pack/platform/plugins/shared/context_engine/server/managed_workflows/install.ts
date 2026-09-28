/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  CONTEXT_ENGINE_DOCUMENT_SUMMARY_WORKFLOW_ID,
  type ManagedWorkflowId,
  type TemplatedManagedWorkflowId,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

/** Must match the `pluginId` on this plugin's managed workflow definitions. */
export const CONTEXT_ENGINE_WORKFLOW_OWNER = 'contextEngine';

/**
 * Every static definition this plugin owns. A new one belongs here rather than in its own
 * install call: `ready()` below deletes this owner's static documents that were not installed
 * during the startup window, so a workflow installed outside this pass is pruned as an orphan.
 *
 * Dynamic definitions are not listed. Feedback analysis installs one instance per AI index, on
 * demand, from `feedback_analysis/schedule.ts`.
 */
const STATIC_WORKFLOWS: ReadonlyArray<{
  workflowId: Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>;
  spaceId: string;
}> = [
  // One global definition, not one per AI index.
  { workflowId: CONTEXT_ENGINE_DOCUMENT_SUMMARY_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
];

/**
 * Installs this plugin's static managed workflows and closes the reconciliation window. The only
 * place that calls `ready()`, so the window never closes over a partial set.
 */
export const installManagedWorkflows = async ({
  workflowsExtensions,
  logger,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}): Promise<void> => {
  try {
    const client = await workflowsExtensions.initManagedWorkflowsClient(
      CONTEXT_ENGINE_WORKFLOW_OWNER
    );

    // Settled rather than fail-fast, so one failure does not hide which other ids still need a
    // retry on the next boot.
    const results = await Promise.allSettled(
      STATIC_WORKFLOWS.map(({ workflowId, spaceId }) => client.install(workflowId, { spaceId }))
    );

    const failures = results.flatMap((result, index) =>
      result.status === 'rejected'
        ? [
            `${STATIC_WORKFLOWS[index].workflowId} (${
              result.reason instanceof Error ? result.reason.message : String(result.reason)
            })`,
          ]
        : []
    );

    if (failures.length > 0) {
      throw new Error(`Failed to install managed workflows: [${failures.join('; ')}]`);
    }

    // ready() also re-applies this owner's dynamic instances (feedback analysis) from the
    // current registry definition. That workflow is restorable, so a re-apply keeps its enablement.
    await client.ready();
  } catch (error) {
    logger.warn(
      `Failed to install Context Engine managed workflows: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

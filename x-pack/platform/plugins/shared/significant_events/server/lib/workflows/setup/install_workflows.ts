/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID,
  type ManagedWorkflowId,
  type TemplatedManagedWorkflowId,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { installMemoryWorkflows } from '../../../memory_and_investigation/lib/memory/install_managed_workflows';
import { GLOBAL_CORE_WORKFLOW_IDS } from '../../maintenance/managed_workflow_targets';

interface WorkflowInstall {
  workflowId: Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>;
  spaceId: string;
}

// Groupings come from `managed_workflow_targets.ts` so install and pause stay in sync.
// These are all non-templated workflows, so they install without template `values`.
const BASE_WORKFLOWS_TO_INSTALL: WorkflowInstall[] = [
  ...GLOBAL_CORE_WORKFLOW_IDS.map((workflowId) => ({
    workflowId,
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  })),
  // Installed in the default space (not global) so its scheduled executions
  // are stored alongside the onboarding executions it triggers.
  {
    workflowId: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
    spaceId: DEFAULT_SPACE_ID,
  },
  // Installed disabled in the default space (streams/KIs are global); enabled on
  // demand by SyncWorkflowService.ensureEnabled from the extraction path, which
  // schedules its trigger. Restorable + `enabled: false` YAML => installed disabled.
  {
    workflowId: SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
    spaceId: DEFAULT_SPACE_ID,
  },
];

// Code Intelligence (Stage 1) extraction. Installed globally like the other core
// KI workflows whenever the code-KI extraction feature flag is on. The workflow's
// `ai.agent` steps target the persisted code-intelligence agent (Sourcerer), whose
// presence can only be checked with a request-scoped registry; that guard lives in
// the `_run` route (request time), not here. The reconciler prunes owner workflows
// not in the installed set, so excluding it when the flag is off also removes a
// previously-installed copy.
const CODE_EXTRACTION_WORKFLOW: WorkflowInstall = {
  workflowId: SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID,
  spaceId: GLOBAL_WORKFLOW_SPACE_ID,
};

export const installWorkflows = async ({
  client,
  includeCodeExtraction,
}: {
  client: PluginScopedManagedWorkflowsApi;
  /** Install the code-intelligence extraction workflow (agent must be present). */
  includeCodeExtraction: boolean;
}): Promise<void> => {
  const workflowsToInstall = includeCodeExtraction
    ? [...BASE_WORKFLOWS_TO_INSTALL, CODE_EXTRACTION_WORKFLOW]
    : BASE_WORKFLOWS_TO_INSTALL;

  // Install every workflow independently and report all failures at once. A fail-fast Promise.all
  // would hide the other failed ids, so the caller could not tell which workflows still need a retry.
  const installs: Array<{ id: string; run: Promise<void> }> = [
    ...workflowsToInstall.map(({ workflowId, spaceId }) => ({
      id: workflowId,
      run: client.install(workflowId, { spaceId }),
    })),
    { id: 'memory workflows', run: installMemoryWorkflows({ client }) },
  ];

  const results = await Promise.allSettled(installs.map(({ run }) => run));

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          `${installs[index].id} (${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          })`,
        ]
      : []
  );

  if (failures.length > 0) {
    throw new Error(`Failed to install managed workflows: [${failures.join('; ')}]`);
  }
};

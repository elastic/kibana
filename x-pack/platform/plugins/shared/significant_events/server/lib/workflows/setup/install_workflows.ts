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

// Groupings come from `managed_workflow_targets.ts` so install and pause stay in sync.
// These are all non-templated workflows, so they install without template `values`.
const WORKFLOWS_TO_INSTALL: Array<{
  workflowId: Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>;
  spaceId: string;
}> = [
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
  // Code Intelligence (Stage 1) extraction. Installed globally like the other
  // core KI workflows; runs manually and on its scheduled trigger.
  {
    workflowId: SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID,
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  },
];

export const installWorkflows = async ({
  client,
}: {
  client: PluginScopedManagedWorkflowsApi;
}): Promise<void> => {
  // Install every workflow independently and report all failures at once. A fail-fast Promise.all
  // would hide the other failed ids, so the caller could not tell which workflows still need a retry.
  const installs: Array<{ id: string; run: Promise<void> }> = [
    ...WORKFLOWS_TO_INSTALL.map(({ workflowId, spaceId }) => ({
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

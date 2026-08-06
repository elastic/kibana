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
  type ManagedWorkflowId,
  type TemplatedManagedWorkflowId,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { installMemoryWorkflows } from '../../../memory_and_investigation/lib/memory/install_managed_workflows';
import {
  GLOBAL_CORE_WORKFLOW_IDS,
  RUN_QUOTA_LIFECYCLE_WORKFLOW_IDS,
} from '../../maintenance/managed_workflow_targets';

// Groupings come from `managed_workflow_targets.ts` so install and pause stay in sync.
const WORKFLOWS_TO_INSTALL: Array<{
  workflowId: Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>;
  spaceId: string;
}> = [
  ...GLOBAL_CORE_WORKFLOW_IDS.map((workflowId) => ({
    workflowId: workflowId as Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>,
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  })),
  // Quota enforce/reset — installed globally, never disabled by pause.
  ...RUN_QUOTA_LIFECYCLE_WORKFLOW_IDS.map((workflowId) => ({
    workflowId: workflowId as Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>,
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  })),
  {
    workflowId: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
    spaceId: DEFAULT_SPACE_ID,
  },
  {
    workflowId: SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID,
    spaceId: DEFAULT_SPACE_ID,
  },
];

export const installWorkflows = async ({
  client,
}: {
  client: PluginScopedManagedWorkflowsApi;
}): Promise<void> => {
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

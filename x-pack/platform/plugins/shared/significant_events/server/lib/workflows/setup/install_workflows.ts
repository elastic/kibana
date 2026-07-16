/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagedWorkflowId, TemplatedManagedWorkflowId } from '@kbn/workflows/managed';
import {
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { installMemoryWorkflows } from '../../../memory_and_investigation/lib/memory/install_managed_workflows';

// These are all non-templated workflows, so they install without template `values`.
const WORKFLOWS_TO_INSTALL: Array<{
  workflowId: Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>;
  spaceId: string;
}> = [
  {
    workflowId: SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  },
  {
    workflowId: SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID,
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
  },
  { workflowId: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  { workflowId: SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  { workflowId: SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  { workflowId: SIGNIFICANT_EVENTS_TRIAGE_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  { workflowId: SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  // Installed in the default space (not global) so its scheduled executions
  // are stored alongside the onboarding executions it triggers.
  {
    workflowId: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
    spaceId: DEFAULT_SPACE_ID,
  },
];

export const installWorkflows = async ({
  client,
  isSignificantEventsMemoryEnabled,
}: {
  client: PluginScopedManagedWorkflowsApi;
  isSignificantEventsMemoryEnabled: boolean;
}): Promise<void> => {
  // Install every workflow independently and report all failures at once. A fail-fast Promise.all
  // would hide the other failed ids, so the caller could not tell which workflows still need a retry.
  const installs: Array<{ id: string; run: Promise<void> }> = [
    ...WORKFLOWS_TO_INSTALL.map(({ workflowId, spaceId }) => ({
      id: workflowId,
      run: client.install(workflowId, { spaceId }),
    })),
    ...(isSignificantEventsMemoryEnabled
      ? [{ id: 'memory workflows', run: installMemoryWorkflows({ client }) }]
      : []),
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

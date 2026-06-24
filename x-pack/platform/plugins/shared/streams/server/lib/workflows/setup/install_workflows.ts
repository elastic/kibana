/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagedWorkflowId, TemplatedManagedWorkflowId } from '@kbn/workflows/managed';
import {
  SIGEVENTS_DETECTION_WORKFLOW_ID,
  SIGEVENTS_DISCOVERY_WORKFLOW_ID,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGEVENTS_TRIAGE_WORKFLOW_ID,
  STREAMS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  STREAMS_KI_ONBOARDING_WORKFLOW_ID,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW_ID,
  STREAMS_KI_SYNC_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { installMemoryWorkflows } from '../../memory/install_managed_workflows';

// These are all non-templated workflows, so they install without template `values`.
const WORKFLOWS_TO_INSTALL: Array<{
  workflowId: Exclude<ManagedWorkflowId, TemplatedManagedWorkflowId>;
  spaceId: string;
}> = [
  { workflowId: STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  { workflowId: STREAMS_KI_QUERIES_GENERATION_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  { workflowId: STREAMS_KI_ONBOARDING_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  { workflowId: SIGEVENTS_DETECTION_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  { workflowId: SIGEVENTS_DISCOVERY_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  { workflowId: SIGEVENTS_TRIAGE_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  { workflowId: SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID, spaceId: GLOBAL_WORKFLOW_SPACE_ID },
  // Installed in the default space (not global) so its scheduled executions
  // are stored alongside the onboarding executions it triggers.
  { workflowId: STREAMS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID, spaceId: DEFAULT_SPACE_ID },
  // Sync runs on its own schedule, independent of extraction state.
  { workflowId: STREAMS_KI_SYNC_WORKFLOW_ID, spaceId: DEFAULT_SPACE_ID },
];

export const installWorkflows = async ({
  client,
  isSignificantEventsMemoryEnabled,
}: {
  client: PluginScopedManagedWorkflowsApi;
  isSignificantEventsMemoryEnabled: boolean;
}): Promise<void> => {
  await Promise.all([
    ...WORKFLOWS_TO_INSTALL.map(({ workflowId, spaceId }) =>
      client.install(workflowId, { spaceId })
    ),
    ...(isSignificantEventsMemoryEnabled ? [installMemoryWorkflows({ client })] : []),
  ]);
};

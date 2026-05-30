/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGEVENTS_DETECTION_WORKFLOW_ID,
  SIGEVENTS_DISCOVERY_WORKFLOW_ID,
  SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID,
  SIGEVENTS_TRIAGE_WORKFLOW_ID,
  STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID,
  STREAMS_KI_ONBOARDING_WORKFLOW_ID,
  STREAMS_KI_QUERIES_GENERATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';

export const installWorkflows = async ({
  client,
}: {
  client: PluginScopedManagedWorkflowsApi;
}): Promise<void> => {
  await Promise.all([
    client.install(STREAMS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    }),
    client.install(STREAMS_KI_QUERIES_GENERATION_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    }),
    client.install(STREAMS_KI_ONBOARDING_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    }),
    client.install(SIGEVENTS_DETECTION_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    }),
    client.install(SIGEVENTS_DISCOVERY_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    }),
    client.install(SIGEVENTS_TRIAGE_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    }),
    client.install(SIGEVENTS_ORCHESTRATOR_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    }),
  ]);
};

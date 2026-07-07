/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';

/**
 * Installs the continuous code-KI extraction managed workflow. Installed in the
 * default space (matching the continuous onboarding workflow) so its scheduled
 * executions are stored alongside the per-stream identify calls it triggers.
 */
export const installCodeExtractionWorkflow = async ({
  client,
}: {
  client: PluginScopedManagedWorkflowsApi;
}): Promise<void> => {
  await client.install(SIGNIFICANT_EVENTS_KI_CODE_EXTRACTION_WORKFLOW_ID, {
    spaceId: DEFAULT_SPACE_ID,
  });
};

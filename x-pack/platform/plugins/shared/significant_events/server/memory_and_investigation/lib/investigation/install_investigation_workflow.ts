/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { RunQuotaSettings } from '../../../../common';
import { runQuotaValuesFor } from '../../../lib/run_quotas/budget_groups';

export const installInvestigationWorkflow = async ({
  client,
  runQuotaSettings,
}: {
  client: PluginScopedManagedWorkflowsApi;
  runQuotaSettings: RunQuotaSettings;
}): Promise<void> => {
  await client.install(SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID, {
    spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    values: runQuotaValuesFor(runQuotaSettings, SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID),
  });
};

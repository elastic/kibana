/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { WorkflowPageAccountReason } from '../../common/pages';
import type { WorkflowProperties } from '../storage/workflow_storage';

export type PageServiceAccountBindings = Pick<
  WorkflowsExecutionEnginePluginStart['serviceAccountBindings'],
  'isEnabled' | 'getWorkloadBinding' | 'getWorkloadServiceAccountSummary'
>;

/**
 * Returns why the workflow's service account can't run a page, or undefined when it can.
 * The public page and the Share modal both use it, so they agree on whether a page is online.
 */
export const checkPageServiceAccount = async (
  serviceAccountBindings: PageServiceAccountBindings,
  {
    workflow,
    workflowId,
    spaceId,
  }: { workflow: WorkflowProperties; workflowId: string; spaceId: string }
): Promise<WorkflowPageAccountReason | undefined> => {
  const accountId = workflow.definition?.settings?.run_as;
  if (!accountId) return 'no_service_account';
  if (!serviceAccountBindings.isEnabled()) return 'service_accounts_disabled';
  const coordinates = { workloadType: 'workflow', workloadId: workflowId, spaceId };
  const binding = await serviceAccountBindings.getWorkloadBinding(coordinates);
  if (binding?.serviceAccountId !== accountId) return 'not_bound';
  const summary = await serviceAccountBindings.getWorkloadServiceAccountSummary(coordinates);
  if (!summary) return 'service_account_missing';
  if (!summary.enabled) return 'service_account_disabled';
  // Kibana has no usable credential, for example for an account re-created after the bind.
  if (!summary.assumable) return 'service_account_not_assumable';
  return undefined;
};

/** A private workflow can't run as a service account: the account has no user profile. */
export const isPrivateWorkflow = (workflow: WorkflowProperties): boolean =>
  workflow.access_control?.access_mode === 'private';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { WorkflowPageDto } from '../pages/types';
import type { WorkflowProperties } from '../storage/workflow_storage';

/** Why a page does not serve. The Share modal shows every reason that applies. */
export type WorkflowPageOfflineReason =
  | 'pages_disabled'
  | 'encryption_unavailable'
  | 'no_access_level'
  | 'page_disabled'
  | 'workflow_disabled'
  | 'workflow_invalid'
  | 'no_service_account'
  | 'service_accounts_disabled'
  | 'not_bound'
  | 'service_account_missing'
  | 'service_account_disabled';

export interface WorkflowPageStatus {
  online: boolean;
  reasons: WorkflowPageOfflineReason[];
}

export interface GetWorkflowPageStatusDeps {
  arePagesEnabled: () => Promise<boolean>;
  serviceAccountBindings: Pick<
    WorkflowsExecutionEnginePluginStart['serviceAccountBindings'],
    'isEnabled' | 'getWorkloadBinding' | 'getWorkloadServiceAccountSummary'
  >;
}

/**
 * Lists every reason a page does not serve, for authors. The public route stops at the first
 * miss; this reads everything, so the author can fix all of it at once. It also checks that the
 * service account exists, which the public route leaves to the run.
 */
export const getWorkflowPageStatus = async (
  { arePagesEnabled, serviceAccountBindings }: GetWorkflowPageStatusDeps,
  {
    page,
    workflow,
    spaceId,
  }: { page: WorkflowPageDto; workflow: WorkflowProperties; spaceId: string }
): Promise<WorkflowPageStatus> => {
  const reasons: WorkflowPageOfflineReason[] = [];
  if (!(await arePagesEnabled())) reasons.push('pages_disabled');
  if (!page.access) reasons.push('no_access_level');
  if (!page.enabled) reasons.push('page_disabled');
  // The page DTO is offline with an access level and the switch on only without an encryption key.
  if (!page.online && page.access && page.enabled) reasons.push('encryption_unavailable');
  if (!workflow.enabled) reasons.push('workflow_disabled');
  if (!workflow.valid) reasons.push('workflow_invalid');

  const accountId = workflow.definition?.settings?.run_as;
  if (!accountId) {
    reasons.push('no_service_account');
  } else if (!serviceAccountBindings.isEnabled()) {
    reasons.push('service_accounts_disabled');
  } else {
    const coordinates = { workloadType: 'workflow', workloadId: page.workflowId, spaceId };
    const binding = await serviceAccountBindings.getWorkloadBinding(coordinates);
    if (binding?.serviceAccountId !== accountId) {
      reasons.push('not_bound');
    } else {
      const summary = await serviceAccountBindings.getWorkloadServiceAccountSummary(coordinates);
      if (!summary) reasons.push('service_account_missing');
      else if (!summary.enabled) reasons.push('service_account_disabled');
    }
  }
  // shortcut: an account deleted and re-created after the bind still reads as healthy here, and
  // fails at mint time (`account_replaced`). Add a reason when core exposes that check.
  return { online: reasons.length === 0, reasons };
};

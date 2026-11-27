/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageServiceAccountBindings } from './check_page_service_account';
import { checkPageServiceAccount, isPrivateWorkflow } from './check_page_service_account';
import type { WorkflowPageOfflineReason, WorkflowPageStatus } from '../../common/pages';
import type { WorkflowPageDto } from '../pages/types';
import type { WorkflowProperties } from '../storage/workflow_storage';

export interface GetWorkflowPageStatusDeps {
  arePagesEnabled: () => Promise<boolean>;
  canEncrypt: boolean;
  serviceAccountBindings: PageServiceAccountBindings;
}

/**
 * Lists every reason a page does not serve, for authors. The public route stops at the first
 * miss; this reads everything, so the author can fix all of it at once.
 */
export const getWorkflowPageStatus = async (
  { arePagesEnabled, canEncrypt, serviceAccountBindings }: GetWorkflowPageStatusDeps,
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
  if (!canEncrypt) reasons.push('encryption_unavailable');
  if (!workflow.enabled) reasons.push('workflow_disabled');
  if (!workflow.valid) reasons.push('workflow_invalid');

  if (isPrivateWorkflow(workflow)) reasons.push('workflow_private');
  const accountReason = await checkPageServiceAccount(serviceAccountBindings, {
    workflow,
    workflowId: page.workflowId,
    spaceId,
  });
  if (accountReason) reasons.push(accountReason);
  return { online: reasons.length === 0, reasons };
};

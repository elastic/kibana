/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';

export interface CheckWorkflowPrivilegeParams {
  security: SecurityPluginStart | undefined;
  request: KibanaRequest;
  spaceId: string;
}

/**
 * Checks that the caller holds all of the provided API privileges in the
 * current space.
 *
 * When the security plugin is disabled there is no privilege model to enforce,
 * so access is allowed (consistent with the rest of Agent Builder).
 */
const hasAllApiPrivileges = async ({
  security,
  request,
  spaceId,
  actions,
}: CheckWorkflowPrivilegeParams & {
  actions: readonly string[];
}): Promise<boolean> => {
  if (!security) {
    return true;
  }

  const kibana = actions.map((action) => security.authz.actions.api.get(action));
  const { hasAllRequested } = await security.authz
    .checkPrivilegesWithRequest(request)
    .atSpace(spaceId, { kibana });

  return hasAllRequested;
};

/**
 * Verifies the caller holds the privileges required to read a workflow before it
 * is referenced (e.g. wrapped in a tool or listed) through Agent Builder.
 */
export const hasWorkflowReadPrivilege = (params: CheckWorkflowPrivilegeParams): Promise<boolean> =>
  hasAllApiPrivileges({ ...params, actions: WorkflowsManagementOperationPrivileges.read });

/**
 * Verifies the caller holds the privileges required to execute a workflow through
 * Agent Builder. Executing does not require reading the definition: the workflow
 * document is loaded to run it, but is never exposed to the caller.
 */
export const hasWorkflowExecutePrivilege = (
  params: CheckWorkflowPrivilegeParams
): Promise<boolean> =>
  hasAllApiPrivileges({ ...params, actions: WorkflowsManagementOperationPrivileges.execute });

export const hasWorkflowCreatePrivilege = (
  params: CheckWorkflowPrivilegeParams
): Promise<boolean> =>
  hasAllApiPrivileges({ ...params, actions: WorkflowsManagementOperationPrivileges.create });

export const hasWorkflowUpdatePrivilege = (
  params: CheckWorkflowPrivilegeParams
): Promise<boolean> =>
  hasAllApiPrivileges({ ...params, actions: WorkflowsManagementOperationPrivileges.update });

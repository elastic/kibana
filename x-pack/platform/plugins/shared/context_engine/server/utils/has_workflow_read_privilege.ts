/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';

/** Same gate Agent Builder applies before it reads a workflow, so a definition is no more visible here. */
export const hasWorkflowReadPrivilege = async ({
  security,
  request,
  spaceId,
}: {
  security: SecurityPluginStart | undefined;
  request: KibanaRequest;
  spaceId: string;
}): Promise<boolean> => {
  if (!security) {
    return true;
  }

  const { hasAllRequested } = await security.authz
    .checkPrivilegesWithRequest(request)
    .atSpace(spaceId, {
      kibana: WorkflowsManagementOperationPrivileges.read.map((action) =>
        security.authz.actions.api.get(action)
      ),
    });
  return hasAllRequested;
};

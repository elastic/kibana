/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { EVALS_API_PRIVILEGES } from '@kbn/evals-plugin/common';

/**
 * Verifies the caller holds `manage_evals` in the active space before the skill
 * launches or saves an experiment
 */
export const hasManageEvalsPrivilege = async ({
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
      kibana: [security.authz.actions.api.get(EVALS_API_PRIVILEGES.manage)],
    });
  return hasAllRequested;
};

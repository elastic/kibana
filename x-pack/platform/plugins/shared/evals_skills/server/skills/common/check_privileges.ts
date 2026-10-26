/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { EVALS_API_PRIVILEGES } from '@kbn/evals-plugin/common';

interface EvalsPrivilegeCheck {
  security: SecurityPluginStart | undefined;
  request: KibanaRequest;
  spaceId: string;
}

const hasEvalsApiPrivilege = async (
  { security, request, spaceId }: EvalsPrivilegeCheck,
  privilege: string
): Promise<boolean> => {
  // No security plugin means security is disabled; treat every caller as authorized.
  if (!security) {
    return true;
  }
  const { hasAllRequested } = await security.authz
    .checkPrivilegesWithRequest(request)
    .atSpace(spaceId, {
      kibana: [security.authz.actions.api.get(privilege)],
    });
  return hasAllRequested;
};

/**
 * Verifies the caller holds `manage_evals` in the active space before the skill
 * launches or saves an experiment.
 */
export const hasManageEvalsPrivilege = (check: EvalsPrivilegeCheck): Promise<boolean> =>
  hasEvalsApiPrivilege(check, EVALS_API_PRIVILEGES.manage);

/**
 * Verifies the caller holds `read_evals` in the active space before the skill
 * enumerates evals resources, mirroring the read routes. `manage_evals` also
 * grants `read_evals`, so managers pass this check too.
 */
export const hasReadEvalsPrivilege = (check: EvalsPrivilegeCheck): Promise<boolean> =>
  hasEvalsApiPrivilege(check, EVALS_API_PRIVILEGES.read);

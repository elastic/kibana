/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { ALERTING_V2_API_PRIVILEGES } from '../../../common/feature_privileges';

export interface CheckAlertingPrivilegeParams {
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
}: CheckAlertingPrivilegeParams & {
  actions: string[];
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
 * Verifies the caller holds the `write-alerting-v2-rules` privilege before
 * composing or modifying a rule attachment through Agent Builder.
 */
export const hasRulesWritePrivilege = (
  params: CheckAlertingPrivilegeParams
): Promise<boolean> =>
  hasAllApiPrivileges({ ...params, actions: [ALERTING_V2_API_PRIVILEGES.rules.write] });

/**
 * Verifies the caller holds the `write-alerting-v2-action-policies` privilege
 * before composing or modifying an action policy attachment through Agent Builder.
 */
export const hasActionPoliciesWritePrivilege = (
  params: CheckAlertingPrivilegeParams
): Promise<boolean> =>
  hasAllApiPrivileges({
    ...params,
    actions: [ALERTING_V2_API_PRIVILEGES.actionPolicies.write],
  });

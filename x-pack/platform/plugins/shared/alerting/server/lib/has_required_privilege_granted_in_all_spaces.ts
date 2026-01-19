/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';

export interface HasRequiredPrivilegeGrantedInAllSpaces {
  spaceIds: string[];
  requiredPrivilege: string;
  request: KibanaRequest;
  authz?: AuthorizationServiceSetup;
}
export const hasRequiredPrivilegeGrantedInAllSpaces = async ({
  requiredPrivilege,
  spaceIds,
  request: req,
  authz,
}: HasRequiredPrivilegeGrantedInAllSpaces): Promise<boolean> => {
  const result = await authz?.checkPrivilegesWithRequest(req).atSpaces(spaceIds, {
    kibana: [authz.actions.api.get(`${requiredPrivilege}`)],
  });

  return result?.hasAllRequested ?? false;
};

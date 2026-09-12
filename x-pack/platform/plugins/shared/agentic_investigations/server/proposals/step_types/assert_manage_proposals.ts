/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { PROPOSALS_API_PRIVILEGE_MANAGE } from '../constants';

export class ProposalsAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProposalsAuthorizationError';
  }
}

/**
 * Gates proposal step handlers on the execution's own privileges, mirroring
 * the `requiredPrivileges` check the HTTP routes enforce. The step runs under
 * the execution's fake request; without this gate any workflow able to
 * resolve the step definition could create or mutate proposals regardless of
 * the caller's privileges.
 *
 * Fails closed: any error from the privilege check itself denies rather than
 * letting the service call through, because an unreadable answer must not
 * become an allow.
 */
export const assertManageProposals = async ({
  request,
  security,
  spaceId,
}: {
  request: KibanaRequest;
  security: SecurityPluginStart;
  spaceId: string;
}): Promise<void> => {
  try {
    const checkPrivileges = security.authz.checkPrivilegesWithRequest(request);
    const privileges = await checkPrivileges.atSpace(spaceId, {
      // The serialized form of a feature API privilege is prefixed (see
      // api_authorization.ts: requestedPrivileges.map(p => actions.api.get(p)));
      // checking the bare string never matches for API-key credentials.
      kibana: [security.authz.actions.api.get(PROPOSALS_API_PRIVILEGE_MANAGE)],
    });
    if (!privileges.hasAllRequested) {
      throw new ProposalsAuthorizationError(
        `Execution user lacks ${PROPOSALS_API_PRIVILEGE_MANAGE} privilege in space [${spaceId}]`
      );
    }
  } catch (error) {
    if (error instanceof ProposalsAuthorizationError) throw error;
    throw new ProposalsAuthorizationError(
      `Privilege check failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

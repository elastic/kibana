/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { PROPOSALS_API_PRIVILEGE_MANAGE, PROPOSALS_API_PRIVILEGE_READ } from '../constants';
import { ProposalForbiddenError } from './errors';

/**
 * The same privileges the routes require, checked against a principal that did
 * not arrive through a route — a workflow execution. The feature declares them
 * as bare operation names, so each has to be turned into its `api:` action
 * before `checkPrivileges` will recognise it.
 */
export interface ProposalPrivilegesDeps {
  getSecurity: () => Promise<SecurityPluginStart | undefined>;
  logger: Logger;
}

export interface ProposalPrivilegesChecker {
  /** Throws when the principal may not write proposals. */
  assertCanManage: (request: KibanaRequest) => Promise<void>;
  /** Throws when the principal may not read proposals. */
  assertCanRead: (request: KibanaRequest) => Promise<void>;
  /**
   * Whether the principal may decide. Returns a boolean rather than throwing so
   * the gate workflow can re-park for someone who can, but lets an unexpected
   * failure throw so a service fault stays distinguishable from a refusal.
   */
  canManage: (request: KibanaRequest) => Promise<boolean>;
}

export const createProposalPrivilegesChecker = ({
  getSecurity,
  logger,
}: ProposalPrivilegesDeps): ProposalPrivilegesChecker => {
  const hasPrivileges = async (request: KibanaRequest, privileges: string[]): Promise<boolean> => {
    const security = await getSecurity();
    if (!security) {
      // Fail closed. Without the security plugin there is no principal to
      // evaluate, and a workflow that cannot be attributed must not write.
      logger.warn('Security is unavailable, so the proposal privilege check fails closed');
      return false;
    }

    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
    const { hasAllRequested } = await checkPrivileges({
      kibana: privileges.map((privilege) => security.authz.actions.api.get(privilege)),
    });

    return hasAllRequested;
  };

  const assertPrivileges = async (
    request: KibanaRequest,
    privileges: string[],
    operation: string
  ): Promise<void> => {
    if (!(await hasPrivileges(request, privileges))) {
      throw new ProposalForbiddenError(
        `Missing privilege ${privileges.join(', ')} required to ${operation} proposals`
      );
    }
  };

  return {
    assertCanManage: (request) =>
      assertPrivileges(request, [PROPOSALS_API_PRIVILEGE_MANAGE], 'write'),
    assertCanRead: (request) => assertPrivileges(request, [PROPOSALS_API_PRIVILEGE_READ], 'read'),
    canManage: (request) => hasPrivileges(request, [PROPOSALS_API_PRIVILEGE_MANAGE]),
  };
};

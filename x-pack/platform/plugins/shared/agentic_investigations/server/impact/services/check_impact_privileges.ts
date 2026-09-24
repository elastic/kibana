/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { INVESTIGATIONS_API_PRIVILEGE_MANAGE } from '../../investigations/constants';
import { ImpactForbiddenError } from './errors/impact_forbidden_error';

/**
 * The same privilege the Impact routes require, checked against a principal
 * that did not arrive through a route — a workflow execution or an in-process
 * caller. Impact has no privilege of its own yet, so reads and writes both use
 * investigations manage. The feature declares the bare operation name, so it
 * has to be turned into its `api:` action before `checkPrivileges` will
 * recognise it.
 */
export interface ImpactPrivilegesDeps {
  getSecurity: () => Promise<SecurityPluginStart | undefined>;
  logger: Logger;
}

export interface ImpactPrivilegesChecker {
  /** Throws when the principal may not write impact. */
  assertCanManage: (request: KibanaRequest) => Promise<void>;
  /** Throws when the principal may not read impact. */
  assertCanRead: (request: KibanaRequest) => Promise<void>;
}

export const createImpactPrivilegesChecker = ({
  getSecurity,
  logger,
}: ImpactPrivilegesDeps): ImpactPrivilegesChecker => {
  const assertPrivilege = async (
    request: KibanaRequest,
    privilege: string,
    operation: string
  ): Promise<void> => {
    const security = await getSecurity();
    if (!security) {
      // Fail closed. Without the security plugin there is no principal to
      // evaluate, and a caller that cannot be attributed must not proceed.
      logger.warn('Security is unavailable, so the impact privilege check fails closed');
      throw new ImpactForbiddenError(
        `Missing privilege ${privilege} required to ${operation} impact`
      );
    }

    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
    const { hasAllRequested } = await checkPrivileges({
      kibana: [security.authz.actions.api.get(privilege)],
    });

    if (!hasAllRequested) {
      throw new ImpactForbiddenError(
        `Missing privilege ${privilege} required to ${operation} impact`
      );
    }
  };

  return {
    assertCanManage: (request) =>
      assertPrivilege(request, INVESTIGATIONS_API_PRIVILEGE_MANAGE, 'write'),
    assertCanRead: (request) =>
      assertPrivilege(request, INVESTIGATIONS_API_PRIVILEGE_MANAGE, 'read'),
  };
};

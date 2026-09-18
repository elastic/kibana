/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { IMPACT_API_PRIVILEGE_MANAGE, IMPACT_API_PRIVILEGE_READ } from '../constants';
import { ImpactForbiddenError } from './errors';

export interface ImpactPrivilegesDeps {
  getSecurity: () => Promise<SecurityPluginStart | undefined>;
  logger: Logger;
}

export interface ImpactPrivilegesChecker {
  assertCanManage: (request: KibanaRequest) => Promise<void>;
  assertCanRead: (request: KibanaRequest) => Promise<void>;
}

/** Same privileges the Impact routes require, checked against a workflow execution. */
export const createImpactPrivilegesChecker = ({
  getSecurity,
  logger,
}: ImpactPrivilegesDeps): ImpactPrivilegesChecker => {
  const hasPrivileges = async (request: KibanaRequest, privileges: string[]): Promise<boolean> => {
    const security = await getSecurity();
    if (!security) {
      // Fail closed. Without the security plugin there is no principal to
      // evaluate, and a workflow that cannot be attributed must not write.
      logger.warn('Security is unavailable, so the impact privilege check fails closed');
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
      throw new ImpactForbiddenError(
        `Missing privilege ${privileges.join(', ')} required to ${operation} impact`
      );
    }
  };

  return {
    assertCanManage: (request) => assertPrivileges(request, [IMPACT_API_PRIVILEGE_MANAGE], 'write'),
    assertCanRead: (request) => assertPrivileges(request, [IMPACT_API_PRIVILEGE_READ], 'read'),
  };
};

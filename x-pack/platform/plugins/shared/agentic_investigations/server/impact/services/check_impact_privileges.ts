/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { IMPACT_API_PRIVILEGE_READ } from '../constants';
import { ImpactForbiddenError } from './errors/impact_forbidden_error';

/**
 * The same `read_impact` privilege the GET route requires, checked against a
 * principal that did not arrive through that route. The feature declares the
 * bare operation name, so it has to be turned into its `api:` action before
 * `checkPrivileges` will recognise it.
 */
export interface ImpactPrivilegesDeps {
  getSecurity: () => Promise<SecurityPluginStart | undefined>;
  logger: Logger;
}

export interface ImpactPrivilegesChecker {
  /** Throws when the principal may not read impact. */
  assertCanRead: (request: KibanaRequest) => Promise<void>;
}

export const createImpactPrivilegesChecker = ({
  getSecurity,
  logger,
}: ImpactPrivilegesDeps): ImpactPrivilegesChecker => {
  const assertCanRead = async (request: KibanaRequest): Promise<void> => {
    const security = await getSecurity();
    if (!security) {
      // Fail closed. Without the security plugin there is no principal to
      // evaluate, and an in-process caller that cannot be attributed must not read.
      logger.warn('Security is unavailable, so the impact privilege check fails closed');
      throw new ImpactForbiddenError(
        `Missing privilege ${IMPACT_API_PRIVILEGE_READ} required to read impact`
      );
    }

    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
    const { hasAllRequested } = await checkPrivileges({
      kibana: [security.authz.actions.api.get(IMPACT_API_PRIVILEGE_READ)],
    });

    if (!hasAllRequested) {
      throw new ImpactForbiddenError(
        `Missing privilege ${IMPACT_API_PRIVILEGE_READ} required to read impact`
      );
    }
  };

  return { assertCanRead };
};

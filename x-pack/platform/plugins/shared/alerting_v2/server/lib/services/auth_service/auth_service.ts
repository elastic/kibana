/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { inject, injectable } from 'inversify';
import {
  ALERTING_V2_API_PRIVILEGES,
  getAlertingPrivilegeDisplayName,
  type AlertingV2Feature,
} from '../../../../common/feature_privileges';
import type { AlertingServerStartDependencies } from '../../../types';
import { RequestSpaceIdToken } from '../spaces_service/tokens';

/**
 * The operations exposed for a given alerting v2 feature. Derived from the
 * privilege catalog so writable features accept `'read' | 'write'` while
 * read-only features (e.g. `executionHistory`) accept `'read'` only.
 */
export type AlertingV2Operation<F extends AlertingV2Feature> =
  keyof (typeof ALERTING_V2_API_PRIVILEGES)[F];

/**
 * A single alerting v2 feature privilege: a feature paired with one of the
 * operations that feature actually defines, so invalid pairs are type errors.
 */
export type AuthRequirement = {
  [F in AlertingV2Feature]: { readonly feature: F; readonly operation: AlertingV2Operation<F> };
}[AlertingV2Feature];

export interface AuthServiceContract {
  ensureAuthorized(requirement: AuthRequirement): Promise<void>;
}

const getApiPrivilege = ({ feature, operation }: AuthRequirement): string => {
  const privileges: Readonly<Record<string, string>> = ALERTING_V2_API_PRIVILEGES[feature];
  return privileges[operation];
};

/**
 * Authorizes the request user against alerting v2 feature privileges, decoupling
 * a feature-level grant (e.g. "Alerts") from the Elasticsearch index privileges
 * of the data streams the operation touches.
 */
@injectable()
export class AuthService implements AuthServiceContract {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(PluginStart<AlertingServerStartDependencies['security']>('security'))
    private readonly security: SecurityPluginStart
  ) {}

  /**
   * Throws a 403 when the request user lacks the given alerting v2 feature
   * privilege; resolves otherwise.
   */
  public async ensureAuthorized(requirement: AuthRequirement): Promise<void> {
    const action = this.security.authz.actions.api.actionFromRouteTag(getApiPrivilege(requirement));

    const { hasAllRequested } = await this.security.authz
      .checkPrivilegesWithRequest(this.request)
      .atSpace(this.spaceId, { kibana: [action] });

    if (!hasAllRequested) {
      const level = requirement.operation === 'write' ? 'all' : 'read';
      throw Boom.forbidden(
        `Unauthorized to access "${getAlertingPrivilegeDisplayName(requirement.feature, level)}"`
      );
    }
  }
}

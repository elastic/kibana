/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import { inject, injectable } from 'inversify';
import {
  ALERTING_V2_API_PRIVILEGES,
  type AlertingV2Feature,
  type WritableAlertingV2Feature,
} from '../../../../common/feature_privileges';
import type { AlertingServerStartDependencies } from '../../../types';
import { RequestSpaceIdToken } from '../spaces_service/tokens';

@injectable()
export class PrivilegeChecker {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(PluginStart<AlertingServerStartDependencies['security']>('security'))
    private readonly security: SecurityPluginStart
  ) {}

  public async canRead(feature: AlertingV2Feature): Promise<boolean> {
    return this.hasApiPrivileges(ALERTING_V2_API_PRIVILEGES[feature].read);
  }

  public async canWrite(feature: WritableAlertingV2Feature): Promise<boolean> {
    return this.hasApiPrivileges(ALERTING_V2_API_PRIVILEGES[feature].write);
  }

  private async hasApiPrivileges(...actions: string[]): Promise<boolean> {
    const kibana = actions.map((a) => this.security.authz.actions.api.actionFromRouteTag(a));
    const { hasAllRequested } = await this.security.authz
      .checkPrivilegesWithRequest(this.request)
      .atSpace(this.spaceId, { kibana });
    return hasAllRequested;
  }
}

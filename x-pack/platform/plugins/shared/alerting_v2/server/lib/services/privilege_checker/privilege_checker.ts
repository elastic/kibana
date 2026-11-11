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
import { WorkflowsManagementOperationPrivileges } from '@kbn/workflows';
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

  /** Whether the user can read workflows and whether they can run them, checked independently. */
  public async getWorkflowPrivileges(): Promise<{ read: boolean; execute: boolean }> {
    const toActions = (privileges: readonly string[]) =>
      privileges.map((privilege) => this.security.authz.actions.api.get(privilege));
    const read = toActions(WorkflowsManagementOperationPrivileges.read);
    const execute = toActions(WorkflowsManagementOperationPrivileges.execute);

    const { privileges } = await this.security.authz
      .checkPrivilegesWithRequest(this.request)
      .atSpace(this.spaceId, { kibana: [...read, ...execute] });
    const authorized = new Set(
      privileges.kibana.filter((entry) => entry.authorized).map((entry) => entry.privilege)
    );
    const hasAll = (actions: string[]) => actions.every((action) => authorized.has(action));

    return { read: hasAll(read), execute: hasAll(execute) };
  }

  private async hasApiPrivileges(...actions: string[]): Promise<boolean> {
    const kibana = actions.map((a) => this.security.authz.actions.api.actionFromRouteTag(a));
    const { hasAllRequested } = await this.security.authz
      .checkPrivilegesWithRequest(this.request)
      .atSpace(this.spaceId, { kibana });
    return hasAllRequested;
  }
}

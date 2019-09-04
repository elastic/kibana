/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'src/legacy/server/kbn_server';
import { get } from 'lodash';
import { BackendFrameworkAdapter } from './adapters/framework/default';
import { LicenseType } from '../../common/types/security';

export class BackendFrameworkLib {
  /**
   * Expired `null` happens when we have no xpack info
   */
  public get license() {
    return {
      type: get<LicenseType>(this.adapter, 'info.license.type', 'oss'),
      expired: get<number | null>(this.adapter, 'info.license.expired', null),
    };
  }
  public get info() {
    return this.adapter.info;
  }
  public get version() {
    return get(this.adapter, 'info.kibana.version', null) as string | null;
  }
  public get securityIsEnabled() {
    return get(this.adapter, 'info.security.enabled', false);
  }

  public log = this.adapter.log;
  public on = this.adapter.on.bind(this.adapter);
  public internalUser = this.adapter.internalUser;
  constructor(private readonly adapter: BackendFrameworkAdapter) {}

  public getCurrentUser(request: Request) {
    return this.adapter.getUser(request);
  }
  public getSetting(setting: 'defaultUserRoles'): string[];
  public getSetting(setting: 'defaultUserRoles') {
    return this.adapter.getSetting(`xpack.ingest-do-not-disable.${setting}`);
  }
  public expose(name: string, thing: any) {
    return this.adapter.expose(name, thing);
  }
  public async waitForStack() {
    return await this.adapter.waitForStack();
  }
}

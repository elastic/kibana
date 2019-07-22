/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BackendFrameworkAdapter, KibanaServerRequest } from './adapters/framework/adapter_types';

export class BackendFrameworkLib {
  /**
   * Expired `null` happens when we have no xpack info
   */
  public license = {
    type: this.adapter.info ? this.adapter.info.license.type : 'unknown',
    expired: this.adapter.info ? this.adapter.info.license.expired : null,
  };
  public securityIsEnabled = this.adapter.info ? this.adapter.info.security.enabled : false;
  public log = this.adapter.log;
  public on = this.adapter.on.bind(this.adapter);
  public internalUser = this.adapter.internalUser;
  constructor(private readonly adapter: BackendFrameworkAdapter) {}

  public getCurrentUser(request: KibanaServerRequest) {
    return this.adapter.getUser(request);
  }
  public getSetting(setting: 'defaultUserRoles'): string[];
  public getSetting(setting: 'defaultUserRoles') {
    return this.adapter.getSetting(`xpack.ingest-do-not-disable.${setting}`);
  }
  public exposeMethod(name: string, method: () => any) {
    return this.adapter.exposeMethod(name, method);
  }
}

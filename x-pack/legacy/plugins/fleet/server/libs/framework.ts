/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkAdapter } from '../adapters/framework/default';
import { FrameworkUser } from '../adapters/framework/adapter_types';

export class FrameworkLib {
  constructor(private readonly adapter: FrameworkAdapter) {}

  public getSetting(setting: 'encryptionKey'): string {
    return this.adapter.getSetting(`xpack.fleet.${setting}`);
  }

  public expose(key: string, method: any) {
    this.adapter.expose(key, method);
  }

  public getServerConfig() {
    return {
      host: this.adapter.getSetting('server.host'),
      protocol: this.adapter.getServerInfo().protocol,
      port: this.adapter.getSetting('server.port'),
      basePath: this.adapter.getSetting('server.basePath'),
    };
  }

  public getInternalUser(): FrameworkUser {
    return {
      kind: 'internal',
    };
  }
}

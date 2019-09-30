/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaLegacyServer, FrameworkAdapter as FrameworkAdapterType } from './adapter_types';

export class FrameworkAdapter implements FrameworkAdapterType {
  constructor(private readonly server: KibanaLegacyServer) {}

  public getSetting(settingPath: string): string {
    return this.server.config().get(settingPath);
  }

  public getServerInfo() {
    return this.server.info;
  }
}

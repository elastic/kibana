/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'src/legacy/server/kbn_server';
import Slapshot from '@mattapperson/slapshot';
// @ts-ignore
import { mirrorPluginStatus } from '../../../../../../server/lib/mirror_plugin_status';
import { internalUser, KibanaUser } from './adapter_types';
import { BackendFrameworkAdapter } from './default';

export class MemorizedBackendFrameworkAdapter {
  public readonly internalUser = internalUser;

  public get info() {
    return Slapshot.memorize(
      `get info`,
      async () => {
        if (!this.adapter) {
          throw new Error('An adapter must be provided when running tests online');
        }
        return this.adapter.info;
      },
      {
        pure: false,
      }
    );
  }

  constructor(private readonly adapter?: BackendFrameworkAdapter) {}

  public on(event: 'xpack.status.green' | 'elasticsearch.status.green', cb: () => void) {
    setTimeout(() => {
      cb();
    }, 5);
  }

  public getSetting(settingPath: string) {
    return Slapshot.memorize(`getSetting - ${JSON.stringify(settingPath)}`, () => {
      if (!this.adapter) {
        throw new Error('An adapter must be provided when running tests online');
      }
      return this.adapter.getSetting(settingPath);
    });
  }

  public log(text: string) {}

  public exposeMethod(name: string, method: () => any) {}

  public async getUser(request: Request): Promise<KibanaUser | null> {
    return await Slapshot.memorize(`getUser - ${JSON.stringify(request)}`, async () => {
      if (!this.adapter) {
        throw new Error('An adapter must be provided when running tests online');
      }
      return await this.adapter.getUser(request);
    });
  }

  public async waitForStack() {
    if (this.adapter) {
      await this.adapter.waitForStack();
    }
  }
}

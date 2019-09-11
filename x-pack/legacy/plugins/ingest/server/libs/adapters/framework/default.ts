/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { get } from 'lodash';
import { Request } from 'src/legacy/server/kbn_server';
import { XPackInfo } from '../../../../../xpack_main/server/lib/xpack_info';
// @ts-ignore
import { mirrorPluginStatus } from '../../../../../../server/lib/mirror_plugin_status';
import {
  FrameworkInfo,
  internalUser,
  KibanaLegacyServer,
  KibanaUser,
  RuntimeFrameworkInfo,
  RuntimeKibanaUser,
} from './adapter_types';

export class BackendFrameworkAdapter {
  public readonly internalUser = internalUser;
  public info: null | FrameworkInfo = null;

  constructor(
    private readonly PLUGIN_ID: string,
    private readonly server: KibanaLegacyServer,
    private readonly CONFIG_PREFIX?: string
  ) {
    const xpackMainPlugin = this.server.plugins.xpack_main;
    const thisPlugin = (this.server.plugins as any)[this.PLUGIN_ID];

    if (thisPlugin) {
      mirrorPluginStatus(xpackMainPlugin, thisPlugin);
    } else {
      throw new Error('Plugin is not initalized in Kibana');
    }

    xpackMainPlugin.status.on('green', () => {
      this.xpackInfoWasUpdatedHandler(xpackMainPlugin.info);
      // Register a function that is called whenever the xpack info changes,
      // to re-compute the license check results for this plugin
      xpackMainPlugin.info
        .feature(this.PLUGIN_ID)
        .registerLicenseCheckResultsGenerator(this.xpackInfoWasUpdatedHandler);
    });
  }

  public on(event: 'xpack.status.green' | 'elasticsearch.status.green', cb: () => void) {
    switch (event) {
      case 'xpack.status.green':
        this.server.plugins.xpack_main.status.on('green', cb);
      case 'elasticsearch.status.green':
        this.server.plugins.elasticsearch.status.on('green', cb);
    }
  }

  public async waitForStack() {
    return new Promise(resolve => {
      this.on('xpack.status.green', () => {
        resolve();
      });
    });
  }

  public getSetting(settingPath: string) {
    return this.server.config().get(settingPath);
  }

  public log(text: string) {
    if (this.server) {
      this.server.log(text);
    } else {
      console.log(text); // eslint-disable-line
    }
  }

  public exposeMethod(name: string, method: () => any) {
    this.server.expose(name, method);
  }

  public async getUser(request: Request): Promise<KibanaUser | null> {
    let user;
    try {
      user = await this.server.plugins.security.getUser(request);
    } catch (e) {
      return null;
    }
    if (user === null) {
      return null;
    }
    const assertKibanaUser = RuntimeKibanaUser.decode(user);
    if (isLeft(assertKibanaUser)) {
      throw new Error(
        `Error parsing user info in ${this.PLUGIN_ID},   ${
          PathReporter.report(assertKibanaUser)[0]
        }`
      );
    }

    return user;
  }

  private xpackInfoWasUpdatedHandler = (xpackInfo: XPackInfo) => {
    let xpackInfoUnpacked: FrameworkInfo;

    // If, for some reason, we cannot get the license information
    // from Elasticsearch, assume worst case and disable
    if (!xpackInfo || !xpackInfo.isAvailable()) {
      this.info = null;
      return;
    }

    try {
      xpackInfoUnpacked = {
        kibana: {
          version: get(this.server, 'plugins.kibana.status.plugin.version', 'unknown'),
        },
        license: {
          type: xpackInfo.license.getType() || 'oss',
          expired: !xpackInfo.license.isActive(),
          expiry_date_in_millis: (xpackInfo.license.getExpiryDateInMillis() !== undefined
            ? xpackInfo.license.getExpiryDateInMillis()
            : -1) as number,
        },
        security: {
          enabled: !!xpackInfo.feature('security') && xpackInfo.feature('security').isEnabled(),
          available: !!xpackInfo.feature('security'),
        },
        watcher: {
          enabled: !!xpackInfo.feature('watcher') && xpackInfo.feature('watcher').isEnabled(),
          available: !!xpackInfo.feature('watcher'),
        },
      };
    } catch (e) {
      this.server.log(`Error accessing required xPackInfo in ${this.PLUGIN_ID} Kibana adapter`);
      throw e;
    }

    const assertData = RuntimeFrameworkInfo.decode(xpackInfoUnpacked);
    if (isLeft(assertData)) {
      throw new Error(
        `Error parsing xpack info in ${this.PLUGIN_ID},   ${PathReporter.report(assertData)[0]}`
      );
    }

    this.info = xpackInfoUnpacked;

    return {
      security: xpackInfoUnpacked.security,
      settings: this.getSetting(this.CONFIG_PREFIX || this.PLUGIN_ID),
    };
  };
}

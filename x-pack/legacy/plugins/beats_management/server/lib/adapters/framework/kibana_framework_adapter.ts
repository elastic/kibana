/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseToolkit } from 'hapi';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { get } from 'lodash';
import { isLeft } from 'fp-ts/lib/Either';
// @ts-ignore
import { mirrorPluginStatus } from '../../../../../../server/lib/mirror_plugin_status';
import {
  BackendFrameworkAdapter,
  FrameworkInfo,
  FrameworkRequest,
  FrameworkResponse,
  FrameworkRouteOptions,
  internalAuthData,
  internalUser,
  KibanaLegacyServer,
  KibanaServerRequest,
  KibanaUser,
  RuntimeFrameworkInfo,
  RuntimeKibanaUser,
  XpackInfo,
} from './adapter_types';

export class KibanaBackendFrameworkAdapter implements BackendFrameworkAdapter {
  public readonly internalUser = internalUser;
  public info: null | FrameworkInfo = null;

  constructor(
    private readonly PLUGIN_ID: string,
    private readonly server: KibanaLegacyServer,
    private readonly CONFIG_PREFIX?: string
  ) {
    const xpackMainPlugin = this.server.plugins.xpack_main;
    const thisPlugin = this.server.plugins.beats_management;

    mirrorPluginStatus(xpackMainPlugin, thisPlugin);

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

  public getSetting(settingPath: string) {
    return this.server.config().get(settingPath);
  }

  public log(text: string) {
    this.server.log(text);
  }

  public exposeStaticDir(urlPath: string, dir: string): void {
    this.server.route({
      handler: {
        directory: {
          path: dir,
        },
      },
      method: 'GET',
      path: urlPath,
    });
  }

  public registerRoute<
    RouteRequest extends FrameworkRequest,
    RouteResponse extends FrameworkResponse
  >(route: FrameworkRouteOptions<RouteRequest, RouteResponse>) {
    this.server.route({
      handler: async (request: KibanaServerRequest, h: ResponseToolkit) => {
        // Note, RuntimeKibanaServerRequest is avalaible to validate request, and its type *is* KibanaServerRequest
        // but is not used here for perf reasons. It's value here is not high enough...
        return await route.handler(await this.wrapRequest<RouteRequest>(request), h);
      },
      method: route.method,
      path: route.path,
      config: route.config,
    });
  }

  private async wrapRequest<InternalRequest extends KibanaServerRequest>(
    req: KibanaServerRequest
  ): Promise<FrameworkRequest<InternalRequest>> {
    const { params, payload, query, headers, info } = req;

    let isAuthenticated = headers.authorization != null;
    let user;
    if (isAuthenticated) {
      user = await this.getUser(req);
      if (!user) {
        isAuthenticated = false;
      }
    }
    return {
      user:
        isAuthenticated && user
          ? {
              kind: 'authenticated',
              [internalAuthData]: headers,
              ...user,
            }
          : {
              kind: 'unauthenticated',
            },
      headers,
      info,
      params,
      payload,
      query,
    };
  }

  private async getUser(request: KibanaServerRequest): Promise<KibanaUser | null> {
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

  private xpackInfoWasUpdatedHandler = (xpackInfo: XpackInfo) => {
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
          type: xpackInfo.license.getType(),
          expired: !xpackInfo.license.isActive(),
          expiry_date_in_millis:
            xpackInfo.license.getExpiryDateInMillis() !== undefined
              ? xpackInfo.license.getExpiryDateInMillis()
              : -1,
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

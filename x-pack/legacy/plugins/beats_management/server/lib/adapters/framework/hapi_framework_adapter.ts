/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicenseType } from './../../../../common/constants/security';
import { KibanaServerRequest } from './adapter_types';
import {
  BackendFrameworkAdapter,
  FrameworkInfo,
  FrameworkRequest,
  FrameworkResponse,
  FrameworkRouteOptions,
  internalAuthData,
  internalUser,
} from './adapter_types';

interface TestSettings {
  enrollmentTokensTtlInSeconds: number;
  encryptionKey: string;
}

export class HapiBackendFrameworkAdapter implements BackendFrameworkAdapter {
  public info: null | FrameworkInfo = null;
  public readonly internalUser = internalUser;

  private settings: TestSettings;
  private server: any;

  constructor(
    settings: TestSettings = {
      encryptionKey: 'something_who_cares',
      enrollmentTokensTtlInSeconds: 10 * 60, // 10 minutes
    },
    hapiServer?: any,
    license: LicenseType = 'trial',
    securityEnabled: boolean = true,
    licenseActive: boolean = true
  ) {
    this.server = hapiServer;
    this.settings = settings;
    const now = new Date();

    this.info = {
      kibana: {
        version: 'unknown',
      },
      license: {
        type: license,
        expired: !licenseActive,
        expiry_date_in_millis: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
      },
      security: {
        enabled: securityEnabled,
        available: securityEnabled,
      },
      watcher: {
        enabled: true,
        available: true,
      },
    };
  }
  public log(text: string) {
    this.server.log(text);
  }
  public on(event: 'xpack.status.green', cb: () => void) {
    cb();
  }
  public getSetting(settingPath: string) {
    switch (settingPath) {
      case 'xpack.beats.enrollmentTokensTtlInSeconds':
        return this.settings.enrollmentTokensTtlInSeconds;
      case 'xpack.beats.encryptionKey':
        return this.settings.encryptionKey;
    }
  }

  public exposeStaticDir(urlPath: string, dir: string): void {
    if (!this.server) {
      throw new Error('Must pass a hapi server into the adapter to use exposeStaticDir');
    }
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
    if (!this.server) {
      throw new Error('Must pass a hapi server into the adapter to use registerRoute');
    }
    const wrappedHandler = (licenseRequired: string[]) => (request: any, h: any) => {
      return route.handler(this.wrapRequest(request), h);
    };

    this.server.route({
      handler: wrappedHandler(route.licenseRequired || []),
      method: route.method,
      path: route.path,
      config: {
        ...route.config,
        auth: false,
      },
    });
  }

  public async injectRequstForTesting({ method, url, headers, payload }: any) {
    return await this.server.inject({ method, url, headers, payload });
  }

  private wrapRequest<InternalRequest extends KibanaServerRequest>(
    req: InternalRequest
  ): FrameworkRequest<InternalRequest> {
    const { params, payload, query, headers, info } = req;

    const isAuthenticated = headers.authorization != null;

    return {
      user: isAuthenticated
        ? {
            kind: 'authenticated',
            [internalAuthData]: headers,
            username: 'elastic',
            roles: ['superuser'],
            full_name: null,
            email: null,
            enabled: true,
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
}

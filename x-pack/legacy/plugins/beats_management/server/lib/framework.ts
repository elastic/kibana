/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseObject, ResponseToolkit } from 'hapi';
import { difference } from 'lodash';
import { BaseReturnType } from '../../common/return_types';
import {
  BackendFrameworkAdapter,
  FrameworkRequest,
  FrameworkResponse,
} from './adapters/framework/adapter_types';

export class BackendFrameworkLib {
  public log = this.adapter.log;
  public on = this.adapter.on.bind(this.adapter);
  public internalUser = this.adapter.internalUser;
  constructor(private readonly adapter: BackendFrameworkAdapter) {
    this.validateConfig();
  }

  public registerRoute<
    RouteRequest extends FrameworkRequest,
    RouteResponse extends FrameworkResponse
  >(route: {
    path: string;
    method: string | string[];
    licenseRequired?: string[];
    requiredRoles?: string[];
    handler: (request: FrameworkRequest<RouteRequest>) => Promise<BaseReturnType>;
    config?: {};
  }) {
    this.adapter.registerRoute({
      ...route,
      handler: this.wrapErrors(
        this.wrapRouteWithSecurity(route.handler, route.licenseRequired || [], route.requiredRoles)
      ),
    });
  }

  public getSetting(setting: 'encryptionKey'): string;
  public getSetting(setting: 'enrollmentTokensTtlInSeconds'): number;
  public getSetting(setting: 'defaultUserRoles'): string[];
  public getSetting(
    setting: 'encryptionKey' | 'enrollmentTokensTtlInSeconds' | 'defaultUserRoles'
  ) {
    return this.adapter.getSetting(`xpack.beats.${setting}`);
  }

  /**
   * Expired `null` happens when we have no xpack info
   */
  public get license() {
    return {
      type: this.adapter.info ? this.adapter.info.license.type : 'unknown',
      expired: this.adapter.info ? this.adapter.info.license.expired : null,
    };
  }

  public get securityIsEnabled() {
    return this.adapter.info ? this.adapter.info.security.enabled : false;
  }

  private validateConfig() {
    const encryptionKey = this.adapter.getSetting('xpack.beats.encryptionKey');

    if (!encryptionKey) {
      this.adapter.log(
        'Using a default encryption key for xpack.beats.encryptionKey. It is recommended that you set xpack.beats.encryptionKey in kibana.yml with a unique token'
      );
    }
  }

  private wrapRouteWithSecurity(
    handler: (request: FrameworkRequest<any>) => Promise<BaseReturnType>,
    requiredLicense: string[],
    requiredRoles?: string[]
  ): (request: FrameworkRequest) => Promise<BaseReturnType> {
    return async (request: FrameworkRequest) => {
      if (
        requiredLicense.length > 0 &&
        (this.license.expired || !requiredLicense.includes(this.license.type))
      ) {
        return {
          error: {
            message: `Your ${this.license.type} license does not support this API or is expired. Please upgrade your license.`,
            code: 403,
          },
          success: false,
        };
      }

      if (requiredRoles) {
        if (request.user.kind !== 'authenticated') {
          return {
            error: {
              message: `Request must be authenticated`,
              code: 403,
            },
            success: false,
          };
        }

        if (
          request.user.kind === 'authenticated' &&
          !request.user.roles.includes('superuser') &&
          difference(requiredRoles, request.user.roles).length !== 0
        ) {
          return {
            error: {
              message: `Request must be authenticated by a user with one of the following user roles: ${requiredRoles.join(
                ','
              )}`,
              code: 403,
            },
            success: false,
          };
        }
      }
      return await handler(request);
    };
  }
  private wrapErrors(
    handler: (request: FrameworkRequest<any>) => Promise<BaseReturnType>
  ): (request: FrameworkRequest, h: ResponseToolkit) => Promise<ResponseObject> {
    return async (request: FrameworkRequest, h: ResponseToolkit) => {
      try {
        const result = await handler(request);
        if (!result.error) {
          return h.response(result);
        }
        return h
          .response({
            error: result.error,
            success: false,
          })
          .code(result.error.code || 400);
      } catch (err) {
        let statusCode = err.statusCode;

        // This is the only known non-status code error in the system, but just in case we have an else
        if (!statusCode && (err.message as string).includes('Invalid user type')) {
          statusCode = 403;
        } else {
          statusCode = 500;
        }

        if (statusCode === 403) {
          return h
            .response({
              error: {
                message: 'Insufficient user permissions for managing Beats configuration',
                code: 403,
              },
              success: false,
            })
            .code(403);
        }

        return h
          .response({
            error: {
              message: err.message,
              code: statusCode,
            },
            success: false,
          })
          .code(statusCode);
      }
    };
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  CoreStart,
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  CustomRequestHandlerContext,
} from '@kbn/core/server';

import type { LicensingPluginSetup, LicenseType } from '@kbn/licensing-plugin/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import { createExecutionContext } from '@kbn/ml-route-utils';

import { PLUGIN } from '../../common/constants';

export interface LicenseStatus {
  isValid: boolean;
  isSecurityEnabled: boolean;
  message?: string;
}

interface SetupSettings {
  pluginId: string;
  minimumLicenseType: LicenseType;
  defaultErrorMessage: string;
  licensing: LicensingPluginSetup;
  logger: Logger;
  coreStart: CoreStart;
}

export type TransformRequestHandlerContext = CustomRequestHandlerContext<{
  alerting?: AlertingApiRequestHandlerContext;
}>;

export class License {
  private coreStart: CoreStart;
  private licenseStatus: LicenseStatus = {
    isValid: false,
    isSecurityEnabled: false,
    message: 'Invalid License',
  };

  constructor({
    pluginId,
    minimumLicenseType,
    defaultErrorMessage,
    licensing,
    logger,
    coreStart,
  }: SetupSettings) {
    this.coreStart = coreStart;
    licensing.license$.subscribe((license) => {
      const { state, message } = license.check(pluginId, minimumLicenseType);
      const hasRequiredLicense = state === 'valid';

      const securityFeature = license.getFeature('security');
      const isSecurityEnabled =
        securityFeature !== undefined &&
        securityFeature.isAvailable === true &&
        securityFeature.isEnabled === true;

      if (hasRequiredLicense) {
        this.licenseStatus = { isValid: true, isSecurityEnabled };
      } else {
        this.licenseStatus = {
          isValid: false,
          isSecurityEnabled,
          message: message || defaultErrorMessage,
        };
        if (message) {
          logger.info(message);
        }
      }
    });
  }

  guardApiRoute<Params, Query, Body>(
    handler: RequestHandler<Params, Query, Body, TransformRequestHandlerContext>
  ) {
    const license = this;

    return async function licenseCheck(
      ctx: TransformRequestHandlerContext,
      request: KibanaRequest<Params, Query, Body>,
      response: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const licenseStatus = license.getStatus();
      const executionContext = createExecutionContext(
        license.coreStart,
        PLUGIN.ID,
        request.route.path
      );

      if (!licenseStatus.isValid) {
        return response.customError({
          body: {
            message: licenseStatus.message || '',
          },
          statusCode: 403,
        });
      }

      return await license.coreStart.executionContext.withContext(executionContext, () =>
        handler(ctx, request, response)
      );
    };
  }

  getStatus() {
    return this.licenseStatus;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';
import {
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from 'kibana/server';

import { LicensingPluginSetup } from '../../../../../../plugins/licensing/server';
import { LicenseType } from '../../../../../../plugins/licensing/common/types';
import { LICENSE_CHECK_STATE } from '../../../../../../plugins/licensing/common/types';

export interface LicenseStatus {
  isValid: boolean;
  message?: string;
}

interface SetupSettings {
  pluginId: string;
  minimumLicenseType: LicenseType;
  defaultErrorMessage: string;
}

export class License {
  private licenseStatus: LicenseStatus;
  private log: Logger;

  constructor(logger: Logger) {
    this.log = logger;
    this.licenseStatus = { isValid: false, message: 'Invalid License' };
  }

  setup(
    { pluginId, minimumLicenseType, defaultErrorMessage }: SetupSettings,
    { licensing }: { licensing: LicensingPluginSetup }
  ) {
    licensing.license$.subscribe(license => {
      const { state, message } = license.check(pluginId, minimumLicenseType);
      const hasRequiredLicense = state === LICENSE_CHECK_STATE.Valid;

      if (hasRequiredLicense) {
        this.licenseStatus = { isValid: true };
      } else {
        this.licenseStatus = {
          isValid: false,
          message: message || defaultErrorMessage,
        };
        if (message) {
          this.log.info(message);
        }
      }
    });
  }

  guardApiRoute(handler: RequestHandler) {
    const license = this;

    return function licenseCheck(
      ctx: RequestHandlerContext,
      request: KibanaRequest,
      response: KibanaResponseFactory
    ) {
      const licenseStatus = license.getStatus();

      if (!licenseStatus.isValid) {
        return response.customError({
          body: {
            message: licenseStatus.message || '',
          },
          statusCode: 403,
        });
      }

      return handler(ctx, request, response);
    };
  }

  getStatus() {
    return this.licenseStatus;
  }
}

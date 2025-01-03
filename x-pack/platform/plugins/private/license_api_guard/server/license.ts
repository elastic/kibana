/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  Logger,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from '@kbn/core/server';

import { ILicense, LicenseType, LicenseCheckState, LicensingPluginStart } from './shared_imports';

type LicenseLogger = Pick<Logger, 'warn'>;
type LicenseDependency = Pick<LicensingPluginStart, 'license$'>;

interface SetupSettings {
  pluginName: string;
  logger: LicenseLogger;
}

interface StartSettings {
  pluginId: string;
  minimumLicenseType: LicenseType;
  licensing: LicenseDependency;
}

export class License {
  private pluginName?: string;
  private logger?: LicenseLogger;
  private licenseCheckState: LicenseCheckState = 'unavailable';
  private licenseType?: LicenseType;

  private _isEsSecurityEnabled: boolean = false;

  setup({ pluginName, logger }: SetupSettings) {
    this.pluginName = pluginName;
    this.logger = logger;
  }

  start({ pluginId, minimumLicenseType, licensing }: StartSettings) {
    if (minimumLicenseType === 'basic') {
      throw Error(
        `Basic licenses don't restrict the use of plugins. Please don't use license_api_guard in the ${pluginId} plugin, or provide a more restrictive minimumLicenseType.`
      );
    }

    licensing.license$.subscribe((license: ILicense) => {
      this.licenseType = license.type;
      this.licenseCheckState = license.check(pluginId, minimumLicenseType!).state;
      // Retrieving security checks the results of GET /_xpack as well as license state,
      // so we're also checking whether security is disabled in elasticsearch.yml.
      this._isEsSecurityEnabled = license.getFeature('security').isEnabled;
    });
  }

  private getLicenseErrorMessage(licenseCheckState: LicenseCheckState): string {
    switch (licenseCheckState) {
      case 'invalid':
        return i18n.translate('xpack.licenseApiGuard.license.errorUnsupportedMessage', {
          defaultMessage:
            'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
          values: { licenseType: this.licenseType!, pluginName: this.pluginName },
        });

      case 'expired':
        return i18n.translate('xpack.licenseApiGuard.license.errorExpiredMessage', {
          defaultMessage:
            'You cannot use {pluginName} because your {licenseType} license has expired.',
          values: { licenseType: this.licenseType!, pluginName: this.pluginName },
        });

      case 'unavailable':
        return i18n.translate('xpack.licenseApiGuard.license.errorUnavailableMessage', {
          defaultMessage:
            'You cannot use {pluginName} because license information is not available at this time.',
          values: { pluginName: this.pluginName },
        });
    }

    return i18n.translate('xpack.licenseApiGuard.license.genericErrorMessage', {
      defaultMessage: 'You cannot use {pluginName} because the license check failed.',
      values: { pluginName: this.pluginName },
    });
  }

  guardApiRoute<Context extends RequestHandlerContext, Params, Query, Body>(
    handler: RequestHandler<Params, Query, Body, Context>
  ) {
    return (
      ctx: Context,
      request: KibanaRequest<Params, Query, Body>,
      response: KibanaResponseFactory
    ) => {
      // We'll only surface license errors if users attempt disallowed access to the API.
      if (this.licenseCheckState !== 'valid') {
        const licenseErrorMessage = this.getLicenseErrorMessage(this.licenseCheckState);
        this.logger?.warn(licenseErrorMessage);

        return response.forbidden({
          body: {
            message: licenseErrorMessage,
          },
        });
      }

      return handler(ctx, request, response);
    };
  }

  public get isEsSecurityEnabled() {
    return this._isEsSecurityEnabled;
  }
}

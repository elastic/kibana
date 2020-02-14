/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, Logger, PluginInitializerContext } from 'src/core/server';

import { PLUGIN } from '../common';
import { License } from './services';
import { ApiRoutes } from './routes';
import { isEsError } from './lib/is_es_error';
import { Dependencies } from './types';

export class SnapshotRestoreServerPlugin implements Plugin<void, void, any, any> {
  private readonly logger: Logger;
  private readonly apiRoutes: ApiRoutes;
  private readonly license: License;

  constructor({ logger, config }: PluginInitializerContext) {
    this.logger = logger.get();
    this.apiRoutes = new ApiRoutes();
    this.license = new License();
  }

  public setup({ http, context }: CoreSetup, { licensing, security }: Dependencies): void {
    const router = http.createRouter();

    this.license.setup(
      {
        pluginId: PLUGIN.id,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.snapshotRestore.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    /**
     * TODO: Check if checkinf for "security" defined is the same as
     * const securityInfo = xpackInfo.feature('security');
     * const isSecurityEnabled = securityInfo && securityInfo.isAvailable() && !securityInfo.isEnabled()
     */
    this.apiRoutes.setup({
      router,
      license: this.license,
      isSecurityEnabled: security !== undefined, // Check
      isSlmEnabled: true, // TODO
      lib: {
        isEsError,
      },
    });
  }

  public start() {
    this.logger.debug('Starting plugin');
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}

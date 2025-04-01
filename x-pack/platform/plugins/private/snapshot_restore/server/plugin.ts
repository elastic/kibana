/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, Logger, PluginInitializerContext } from '@kbn/core/server';

import { PLUGIN, APP_REQUIRED_CLUSTER_PRIVILEGES } from '../common';
import { License } from './services';
import { ApiRoutes } from './routes';
import { wrapEsError } from './lib';
import { handleEsError } from './shared_imports';
import type { Dependencies } from './types';
import { SnapshotRestoreConfig } from './config';

export class SnapshotRestoreServerPlugin implements Plugin<void, void, any, any> {
  private readonly logger: Logger;
  private readonly apiRoutes: ApiRoutes;
  private readonly license: License;

  constructor(private context: PluginInitializerContext) {
    const { logger } = this.context;
    this.logger = logger.get();
    this.apiRoutes = new ApiRoutes();
    this.license = new License();
  }

  public setup({ http }: CoreSetup, { licensing, features, security, cloud }: Dependencies): void {
    const pluginConfig = this.context.config.get<SnapshotRestoreConfig>();

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

    features.registerElasticsearchFeature({
      id: PLUGIN.id,
      management: {
        data: [PLUGIN.id],
      },
      catalogue: [PLUGIN.id],
      privileges: [
        {
          requiredClusterPrivileges: [...APP_REQUIRED_CLUSTER_PRIVILEGES],
          ui: [],
        },
      ],
    });

    this.apiRoutes.setup({
      router,
      license: this.license,
      config: {
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
        isCloudEnabled: cloud !== undefined && cloud.isCloudEnabled,
        isSlmEnabled: pluginConfig.slm_ui.enabled,
      },
      lib: {
        handleEsError,
        wrapEsError,
      },
    });
  }

  public start() {}
}

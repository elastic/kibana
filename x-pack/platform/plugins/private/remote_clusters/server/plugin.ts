/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';

import { PLUGIN } from '../common/constants';
import { Dependencies, LicenseStatus, RouteDependencies } from './types';
import { RemoteClustersConfig, RemoteClustersConfig7x } from './config';
import {
  registerGetRoute,
  registerAddRoute,
  registerUpdateRoute,
  registerDeleteRoute,
} from './routes/api';

import { handleEsError } from './shared_imports';

export interface RemoteClustersPluginSetup {
  isUiEnabled: boolean;
}

export class RemoteClustersServerPlugin
  implements Plugin<RemoteClustersPluginSetup, void, any, any>
{
  licenseStatus: LicenseStatus;
  log: Logger;
  config: RemoteClustersConfig | RemoteClustersConfig7x;

  constructor({ logger, config }: PluginInitializerContext) {
    this.log = logger.get();
    this.config = config.get();
    this.licenseStatus = { valid: false };
  }

  setup({ http }: CoreSetup, { features, licensing, cloud }: Dependencies) {
    const router = http.createRouter();

    const routeDependencies: RouteDependencies = {
      router,
      getLicenseStatus: () => this.licenseStatus,
      config: {
        isCloudEnabled: Boolean(cloud?.isCloudEnabled),
      },
      lib: {
        handleEsError,
      },
    };

    features.registerElasticsearchFeature({
      id: 'remote_clusters',
      management: {
        data: ['remote_clusters'],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['manage'],
          ui: [],
        },
      ],
    });

    // Register routes
    registerGetRoute(routeDependencies);
    registerAddRoute(routeDependencies);
    registerUpdateRoute(routeDependencies);
    registerDeleteRoute(routeDependencies);

    licensing.license$.subscribe((license) => {
      const { state, message } = license.check(PLUGIN.getI18nName(), PLUGIN.minimumLicenseType);
      const hasRequiredLicense = state === 'valid';
      if (hasRequiredLicense) {
        this.licenseStatus = { valid: true };
      } else {
        this.licenseStatus = {
          valid: false,
          message:
            message ||
            i18n.translate('xpack.remoteClusters.licenseCheckErrorMessage', {
              defaultMessage: 'License check failed',
            }),
        };
        if (message) {
          this.log.info(message);
        }
      }
    });

    return {
      isUiEnabled: this.config.ui.enabled,
    };
  }

  start() {}

  stop() {}
}

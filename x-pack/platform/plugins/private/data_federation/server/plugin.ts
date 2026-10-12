/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';
import { License } from '@kbn/license-api-guard-plugin/server';
import { MINIMUM_LICENSE_TYPE, PLUGIN_ID, PLUGIN_NAME } from '../common';
import { registerDataSetsRoutes } from './routes/register_routes';
import type { DataFederationConfigType } from './config';

export class DataFederationServerPlugin implements Plugin<
  void,
  void,
  { features: FeaturesPluginSetup },
  { licensing: LicensingPluginStart }
> {
  private readonly config: DataFederationConfigType;
  private readonly logger: Logger;
  private readonly license = new License();

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<DataFederationConfigType>();
    this.logger = initializerContext.logger.get();
  }

  public setup({ http }: CoreSetup, { features }: { features: FeaturesPluginSetup }) {
    if (!this.config.enabled) {
      return;
    }

    this.license.setup({ pluginName: PLUGIN_NAME, logger: this.logger });

    features.registerElasticsearchFeature({
      id: PLUGIN_ID,
      management: {
        data: [PLUGIN_ID],
      },
      privileges: [
        {
          requiredClusterPrivileges: ['manage'],
          ui: ['manageFederatedData'],
        },
      ],
    });

    registerDataSetsRoutes(http.createRouter(), this.license, this.config);
  }

  public start(_core: CoreStart, { licensing }: { licensing: LicensingPluginStart }) {
    if (!this.config.enabled) {
      return;
    }

    this.license.start({
      pluginId: PLUGIN_ID,
      minimumLicenseType: MINIMUM_LICENSE_TYPE,
      licensing,
    });
  }

  public stop() {}
}

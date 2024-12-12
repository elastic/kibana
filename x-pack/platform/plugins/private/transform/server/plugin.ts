/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  PluginInitializerContext,
} from '@kbn/core/server';

import type { LicenseType } from '@kbn/licensing-plugin/common/types';

import { registerCollector } from './usage';
import { setupCapabilities } from './capabilities';
import type { PluginSetupDependencies, PluginStartDependencies } from './types';
import { registerRoutes } from './routes';
import { License } from './services';
import { registerTransformHealthRuleType } from './lib/alerting';

const basicLicense: LicenseType = 'basic';

const PLUGIN = {
  id: 'transform',
  minimumLicenseType: basicLicense,
  getI18nName: (): string =>
    i18n.translate('xpack.transform.appTitle', {
      defaultMessage: 'Transforms',
    }),
};

export class TransformServerPlugin implements Plugin<{}, void, any, any> {
  private readonly logger: Logger;

  private fieldFormatsStart: PluginStartDependencies['fieldFormats'] | null = null;

  constructor(initContext: PluginInitializerContext) {
    this.logger = initContext.logger.get();
  }

  setup(
    coreSetup: CoreSetup<PluginStartDependencies>,
    {
      licensing,
      features,
      alerting,
      security: securitySetup,
      usageCollection,
    }: PluginSetupDependencies
  ): {} {
    const { http, getStartServices } = coreSetup;

    setupCapabilities(coreSetup, securitySetup);

    features.registerElasticsearchFeature({
      id: PLUGIN.id,
      management: {
        data: [PLUGIN.id],
      },
      catalogue: [PLUGIN.id],
      privileges: [
        {
          requiredClusterPrivileges: ['monitor_transform'],
          ui: [],
        },
      ],
    });

    registerRoutes({
      router: http.createRouter(),
      getLicense: async () => {
        const [coreStart] = await getStartServices();
        return new License({
          pluginId: PLUGIN.id,
          minimumLicenseType: PLUGIN.minimumLicenseType,
          defaultErrorMessage: i18n.translate('xpack.transform.licenseCheckErrorMessage', {
            defaultMessage: 'License check failed',
          }),
          licensing,
          logger: this.logger,
          coreStart,
        });
      },
      getDataViewsStart: async () => {
        const [, { dataViews }] = await getStartServices();
        return dataViews;
      },
      getCoreStart: async () => {
        const [coreStart] = await getStartServices();
        return coreStart;
      },
      getSecurity: async () => {
        const [, { security }] = await getStartServices();
        return security;
      },
    });

    if (usageCollection) {
      registerCollector(usageCollection, async () => {
        const [coreStart] = await getStartServices();
        return coreStart.savedObjects.getIndexForType('alert');
      });
    }

    if (alerting) {
      registerTransformHealthRuleType({
        alerting,
        logger: this.logger,
        getFieldFormatsStart: () => this.fieldFormatsStart!,
      });
    }

    return {};
  }

  start(core: CoreStart, plugins: PluginStartDependencies) {
    this.fieldFormatsStart = plugins.fieldFormats;
  }

  stop() {}
}

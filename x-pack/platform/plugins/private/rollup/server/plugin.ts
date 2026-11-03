/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, Logger, PluginInitializerContext } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import { PLUGIN, CONFIG_ROLLUPS, CONFIG_ROLLUP_UI_ENABLED } from '../common';
import type { Dependencies } from './types';
import { registerApiRoutes } from './routes';
import { License } from './services';
import { registerRollupUsageCollector } from './collectors';
import { rollupDataEnricher } from './rollup_data_enricher';
import type { RollupConfig } from './config';

export class RollupPlugin implements Plugin<void, void, any, any> {
  private readonly config: RollupConfig;
  private readonly logger: Logger;
  private readonly license: License;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
    this.logger = initializerContext.logger.get();
    this.license = new License();
  }

  public setup(
    { http, uiSettings, getStartServices }: CoreSetup,
    { features, licensing, indexManagement, usageCollection, dataViews, data }: Dependencies
  ) {
    this.license.setup(
      {
        pluginId: PLUGIN.ID,
        minimumLicenseType: PLUGIN.minimumLicenseType,
        defaultErrorMessage: i18n.translate('xpack.rollupJobs.licenseCheckErrorMessage', {
          defaultMessage: 'License check failed',
        }),
      },
      {
        licensing,
        logger: this.logger,
      }
    );

    features.registerElasticsearchFeature({
      id: 'rollup_jobs',
      management: {
        data: ['rollup_jobs'],
      },
      catalogue: ['rollup_jobs'],
      privileges: [
        {
          requiredClusterPrivileges: ['manage_rollup'],
          ui: [],
        },
      ],
    });

    registerApiRoutes({
      router: http.createRouter(),
      license: this.license,
      lib: {
        handleEsError,
      },
    });

    uiSettings.register({
      [CONFIG_ROLLUP_UI_ENABLED]: {
        name: i18n.translate('xpack.rollupJobs.enableUiTitle', {
          defaultMessage: 'Enable rollup jobs UI',
        }),
        value: this.config.ui.enabled,
        description: i18n.translate('xpack.rollupJobs.enableUiDescription', {
          defaultMessage:
            'Show Rollup Jobs in Stack Management. Applies to users with the required rollup privileges.',
        }),
        category: ['rollups'],
        schema: schema.boolean(),
        requiresPageReload: true,
        deprecation: {
          message: i18n.translate('xpack.rollupJobs.enableUiDeprecation', {
            defaultMessage: 'Rollup jobs are deprecated. Use downsampling instead.',
          }),
          docLinksKey: 'rollupSettings',
        },
      },
      [CONFIG_ROLLUPS]: {
        name: i18n.translate('xpack.rollupJobs.rollupDataViewsTitle', {
          defaultMessage: 'Enable rollup data views',
        }),
        value: true,
        description: i18n.translate('xpack.rollupJobs.rollupDataViewsDescription', {
          defaultMessage: `Enable the creation of data views that capture rollup indices,
              which in turn enable visualizations based on rollup data.`,
        }),
        category: ['rollups'],
        schema: schema.boolean(),
        requiresPageReload: true,
        deprecation: {
          message: i18n.translate('xpack.rollupJobs.rollupDataViewsDeprecation', {
            defaultMessage: 'This setting is deprecated and will be removed in Kibana 9.0.',
          }),
          docLinksKey: 'rollupSettings',
        },
      },
    });

    if (usageCollection) {
      try {
        const getIndexForType = (type: string) =>
          getStartServices().then(([coreStart]) => coreStart.savedObjects.getIndexForType(type));
        registerRollupUsageCollector(usageCollection, getIndexForType);
      } catch (e) {
        this.logger.warn(`Registering Rollup collector failed: ${e}`);
      }
    }

    if (indexManagement && indexManagement.indexDataEnricher) {
      indexManagement.indexDataEnricher.add(rollupDataEnricher);
    }

    dataViews.enableRollups();
    data.search.enableRollups();
  }

  start() {}

  stop() {}
}

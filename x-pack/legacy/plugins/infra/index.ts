/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import JoiNamespace from 'joi';
import { resolve } from 'path';
import { PluginInitializerContext } from 'src/core/server';
import KbnServer from 'src/legacy/server/kbn_server';
import { getConfigSchema } from './server/kibana.index';
import { savedObjectMappings } from './server/saved_objects';
import { plugin, InfraServerPluginDeps } from './server/new_platform_index';
import { UsageCollector } from './server/usage/usage_collector';
import { InfraSetup } from '../../../plugins/infra/server';
import { getApmIndices } from '../apm/server/lib/settings/apm_indices/get_apm_indices';

const APP_ID = 'infra';
const logsSampleDataLinkLabel = i18n.translate('xpack.infra.sampleDataLinkLabel', {
  defaultMessage: 'Logs',
});

export function infra(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.infra',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'metrics'],
    uiExports: {
      app: {
        description: i18n.translate('xpack.infra.infrastructureDescription', {
          defaultMessage: 'Explore your metrics',
        }),
        icon: 'plugins/infra/images/infra_mono_white.svg',
        main: 'plugins/infra/app',
        title: i18n.translate('xpack.infra.infrastructureTitle', {
          defaultMessage: 'Metrics',
        }),
        listed: false,
        url: `/app/${APP_ID}#/infrastructure`,
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      home: ['plugins/infra/register_feature'],
      links: [
        {
          description: i18n.translate('xpack.infra.linkInfrastructureDescription', {
            defaultMessage: 'Explore your metrics',
          }),
          icon: 'plugins/infra/images/infra_mono_white.svg',
          euiIconType: 'metricsApp',
          id: 'infra:home',
          order: 8000,
          title: i18n.translate('xpack.infra.linkInfrastructureTitle', {
            defaultMessage: 'Metrics',
          }),
          url: `/app/${APP_ID}#/infrastructure`,
        },
        {
          description: i18n.translate('xpack.infra.linkLogsDescription', {
            defaultMessage: 'Explore your logs',
          }),
          icon: 'plugins/infra/images/logging_mono_white.svg',
          euiIconType: 'logsApp',
          id: 'infra:logs',
          order: 8001,
          title: i18n.translate('xpack.infra.linkLogsTitle', {
            defaultMessage: 'Logs',
          }),
          url: `/app/${APP_ID}#/logs`,
        },
      ],
      mappings: savedObjectMappings,
    },
    config(Joi: typeof JoiNamespace) {
      return getConfigSchema(Joi);
    },
    init(legacyServer: any) {
      const { newPlatform } = legacyServer as KbnServer;
      const { core, plugins } = newPlatform.setup;

      const infraSetup = (plugins.infra as unknown) as InfraSetup; // chef's kiss

      const initContext = ({
        config: infraSetup.__legacy.config,
        getUiSettingsService: legacyServer.getUiSettingsService, // NP_TODO: Replace this with route handler context instead when ready, see: https://github.com/elastic/kibana/issues/44994
      } as unknown) as PluginInitializerContext;
      // NP_TODO: Use real types from the other plugins as they are migrated
      const pluginDeps: InfraServerPluginDeps = {
        indexPatterns: {
          indexPatternsServiceFactory: legacyServer.indexPatternsServiceFactory,
        },
        metrics: legacyServer.plugins.metrics,
        spaces: legacyServer.plugins.spaces,
        savedObjects: legacyServer.savedObjects,
        features: plugins.features,
        apm: {
          getIndices: () => getApmIndices(legacyServer),
        },
      };

      const infraPluginInstance = plugin(initContext);
      infraPluginInstance.setup(core, pluginDeps);

      // NP_TODO: EVERYTHING BELOW HERE IS LEGACY, MIGHT NEED TO MOVE SOME OF IT TO NP, NOT SURE HOW

      const libs = infraPluginInstance.getLibs();

      // NP_TODO how do we replace this? Answer: return from setup function.
      legacyServer.expose(
        'defineInternalSourceConfiguration',
        libs.sources.defineInternalSourceConfiguration.bind(libs.sources)
      );

      // Register a function with server to manage the collection of usage stats
      legacyServer.usage.collectorSet.register(UsageCollector.getUsageCollector(legacyServer));

      // NP_TODO: How do we move this to new platform?
      legacyServer.addAppLinksToSampleDataset('logs', [
        {
          path: `/app/${APP_ID}#/logs`,
          label: logsSampleDataLinkLabel,
          icon: 'logsApp',
        },
      ]);
    },
  });
}

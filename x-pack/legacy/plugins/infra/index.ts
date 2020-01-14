/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import JoiNamespace from 'joi';
import { resolve } from 'path';
import { PluginInitializerContext } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import KbnServer from 'src/legacy/server/kbn_server';
import { getConfigSchema } from './server/kibana.index';
import { savedObjectMappings } from './server/saved_objects';
import { plugin, InfraServerPluginDeps } from './server/new_platform_index';
import { InfraSetup } from '../../../plugins/infra/server';
import { PluginSetupContract as FeaturesPluginSetup } from '../../../plugins/features/server';
import { SpacesPluginSetup } from '../../../plugins/spaces/server';
import { VisTypeTimeseriesSetup } from '../../../../src/plugins/vis_type_timeseries/server';
import { APMPluginContract } from '../../../plugins/apm/server';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/utils';

export const APP_ID = 'infra';

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
          category: DEFAULT_APP_CATEGORIES.observability,
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
          category: DEFAULT_APP_CATEGORIES.observability,
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
      } as unknown) as PluginInitializerContext;
      // NP_TODO: Use real types from the other plugins as they are migrated
      const pluginDeps: InfraServerPluginDeps = {
        home: legacyServer.newPlatform.setup.plugins.home,
        usageCollection: plugins.usageCollection as UsageCollectionSetup,
        indexPatterns: {
          indexPatternsServiceFactory: legacyServer.indexPatternsServiceFactory,
        },
        metrics: plugins.metrics as VisTypeTimeseriesSetup,
        spaces: plugins.spaces as SpacesPluginSetup,
        features: plugins.features as FeaturesPluginSetup,
        apm: plugins.apm as APMPluginContract,
      };

      const infraPluginInstance = plugin(initContext);
      infraPluginInstance.setup(core, pluginDeps);

      // NP_TODO: EVERYTHING BELOW HERE IS LEGACY

      const libs = infraPluginInstance.getLibs();

      // NP_NOTE: Left here for now for legacy plugins to consume
      legacyServer.expose(
        'defineInternalSourceConfiguration',
        libs.sources.defineInternalSourceConfiguration.bind(libs.sources)
      );
    },
  });
}

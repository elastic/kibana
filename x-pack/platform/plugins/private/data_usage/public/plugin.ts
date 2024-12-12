/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import {
  DataUsagePublicSetup,
  DataUsagePublicStart,
  DataUsageStartDependencies,
  DataUsageSetupDependencies,
  DataUsagePublicConfigType,
} from './types';
import { PLUGIN_ID } from '../common';
import { PLUGIN_NAME } from './translations';
import {
  ExperimentalFeatures,
  parseExperimentalConfigValue,
} from '../common/experimental_features';
export class DataUsagePlugin
  implements
    Plugin<
      DataUsagePublicSetup,
      DataUsagePublicStart,
      DataUsageSetupDependencies,
      DataUsageStartDependencies
    >
{
  private config: DataUsagePublicConfigType;
  private experimentalFeatures: ExperimentalFeatures;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<DataUsagePublicConfigType>();
    this.experimentalFeatures = {} as ExperimentalFeatures;
  }

  public setup(
    core: CoreSetup<DataUsageStartDependencies, DataUsagePublicStart>,
    plugins: DataUsageSetupDependencies
  ): DataUsagePublicSetup {
    const { management } = plugins;

    this.experimentalFeatures = parseExperimentalConfigValue(
      this.config.enableExperimental
    ).features;

    const experimentalFeatures = this.experimentalFeatures;

    if (!experimentalFeatures.dataUsageDisabled) {
      management.sections.section.data.registerApp({
        id: PLUGIN_ID,
        title: PLUGIN_NAME,
        order: 6,
        keywords: ['data usage', 'usage'],
        async mount(params: ManagementAppMountParams) {
          const [{ renderApp }, [coreStart, pluginsStartDeps, pluginStart]] = await Promise.all([
            import('./application'),
            core.getStartServices(),
          ]);

          return renderApp(coreStart, pluginsStartDeps, pluginStart, params);
        },
      });
    }
    return {};
  }

  public start(_core: CoreStart, plugins: DataUsageStartDependencies): DataUsagePublicStart {
    return {};
  }

  public stop() {}
}

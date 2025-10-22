/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Plugin, CoreSetup, PluginInitializerContext } from '@kbn/core/public';

import type {
  SetupDependencies,
  StartDependencies,
  AppDependencies,
  ClientConfigType,
} from './types';

export class UpgradeAssistantUIPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  constructor(private ctx: PluginInitializerContext) {}

  setup(
    coreSetup: CoreSetup<StartDependencies>,
    { management, cloud, share, usageCollection }: SetupDependencies
  ) {
    const {
      featureSet,
      ui: { enabled: isUpgradeAssistantUiEnabled },
    } = this.ctx.config.get<ClientConfigType>();

    if (isUpgradeAssistantUiEnabled) {
      const appRegistrar = management.sections.section.stack;
      const kibanaVersion = this.ctx.env.packageInfo.version.split('.');
      const kibanaVersionMajor = Number(kibanaVersion[0]);

      const kibanaVersionInfo = {
        currentMajor: kibanaVersionMajor,
        prevMajor: kibanaVersionMajor - 1,
        nextMajor: kibanaVersionMajor + 1,
        currentMinor: Number(kibanaVersion[1]),
        currentPatch: Number(kibanaVersion[2]),
      };

      const pluginName = i18n.translate('xpack.upgradeAssistant.appTitle', {
        defaultMessage: 'Upgrade Assistant',
      });

      if (usageCollection) {
        import('./application/lib/ui_metric').then(({ uiMetricService }) => {
          uiMetricService.setup(usageCollection);
        });
      }

      appRegistrar.registerApp({
        id: 'upgrade_assistant',
        title: pluginName,
        order: 1,
        async mount(params) {
          const [coreStart, { data, reindexService }] = await coreSetup.getStartServices();

          const {
            chrome: { docTitle },
          } = coreStart;

          docTitle.change(pluginName);

          const appDependencies: AppDependencies = {
            featureSet,
            kibanaVersionInfo,
            plugins: {
              cloud,
              share,
              reindexService,
            },
            services: {
              core: coreStart,
              data,
              history: params.history,
            },
          };

          const { mountManagementSection } = await import('./application/mount_management_section');
          const unmountAppCallback = mountManagementSection(params, appDependencies);

          return () => {
            docTitle.reset();
            unmountAppCallback();
          };
        },
      });
    }
  }

  start() {}
  stop() {}
}

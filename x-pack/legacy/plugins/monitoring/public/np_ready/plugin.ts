/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FeatureCatalogueCategory } from '../../../../../../src/plugins/home/public';
import { App, AppMountContext, AppMountParameters, CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/public';
import { NavigationPublicPluginStart as NavigationStart } from '../../../../../../src/plugins/navigation/public';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { initAngularBootstrap } from '../../../../../../src/plugins/kibana_legacy/public';

export interface MonitoringPluginDependencies {
  navigation: NavigationStart
  data: DataPublicPluginStart
  element: HTMLElement
  core: AppMountContext['core']
  isCloud: boolean
  pluginInitializerContext: PluginInitializerContext
}

export class MonitoringPlugin implements Plugin<void, void, MonitoringPluginDependencies, MonitoringPluginDependencies> {
  constructor(private initializerContext: PluginInitializerContext) { }

  public setup(core: CoreSetup<MonitoringPluginDependencies>, plugins: object & { home?: any, cloud?: { isCloudEnabled: boolean } }) {
    const { home } = plugins;

    //console.log('...plugins:', plugins);

    if (home) {
      home.featureCatalogue.register({
        id: 'monitoring',
        title: i18n.translate('xpack.monitoring.monitoringTitle', {
          defaultMessage: 'Monitoring',
        }),
        description: i18n.translate('xpack.monitoring.monitoringDescription', {
          defaultMessage: 'Track the real-time health and performance of your Elastic Stack.',
        }),
        icon: 'monitoringApp',
        path: '/app/monitoring',
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      });
    }

    initAngularBootstrap();

    const app: App = {
      id: 'monitoring',
      title: 'Monitoring',
      mount: async (context: AppMountContext, params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();

        console.log('...coreStart:', coreStart);

        const { AngularApp } = await import('../np_imports/angular');

        
        const deps: MonitoringPluginDependencies = {
          navigation: pluginsStart.navigation,
          element: params.element,
          //core: context.core,
          core: coreStart,
          data: pluginsStart.data,
          isCloud: Boolean(plugins.cloud?.isCloudEnabled),
          pluginInitializerContext: this.initializerContext,
        }

        this.setInitialTimefilter(deps);

        const monitoringApp = new AngularApp(deps);
        return monitoringApp.destroy;
      },
    };

    
    core.application.register(app);
  }

  public start(core: CoreStart, plugins: any) {


  }

  public stop() { }

  private setInitialTimefilter({ core: coreContext, data }: MonitoringPluginDependencies) {
    const { timefilter } = data.query.timefilter;
    const { uiSettings } = coreContext;
    const refreshInterval = { value: 10000, pause: false };
    const time = { from: 'now-1h', to: 'now' };
    timefilter.setRefreshInterval(refreshInterval);
    timefilter.setTime(time);
    uiSettings.overrideLocalDefault(
      'timepicker:refreshIntervalDefaults',
      JSON.stringify(refreshInterval)
    );
    uiSettings.overrideLocalDefault(
      'timepicker:timeDefaults',
      JSON.stringify(time)
    );
  }
}

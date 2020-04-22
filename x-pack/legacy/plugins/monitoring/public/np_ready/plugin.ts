/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../views/all';
import { i18n } from '@kbn/i18n';
import {
  App,
  AppMountContext,
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from 'kibana/public';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../../../src/plugins/home/public';
import { initAngularBootstrap } from '../../../../../../src/plugins/kibana_legacy/public';
import { MonitoringConfig } from '../../../../../plugins/monitoring/server/config';
import { DEFAULT_APP_CATEGORIES } from '../../../../../../src/core/utils';
import { MonitoringPluginDependencies } from './types';

import {
  MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
  KIBANA_ALERTING_ENABLED,
} from '../../common/constants';

export class MonitoringPlugin
  implements Plugin<void, void, MonitoringPluginDependencies, MonitoringPluginDependencies> {
  constructor(private initializerContext: PluginInitializerContext<MonitoringConfig>) {}

  public setup(
    core: CoreSetup<MonitoringPluginDependencies>,
    plugins: object & { home?: HomePublicPluginSetup; cloud?: { isCloudEnabled: boolean } }
  ) {
    const { home } = plugins;
    const id = 'monitoring';
    const icon = 'monitoringApp';
    const path = '/app/monitoring';
    const title = i18n.translate('xpack.monitoring.stackMonitoringTitle', {
      defaultMessage: 'Stack Monitoring',
    });

    if (home) {
      home.featureCatalogue.register({
        id,
        title,
        icon,
        path,
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
        description: i18n.translate('xpack.monitoring.monitoringDescription', {
          defaultMessage: 'Track the real-time health and performance of your Elastic Stack.',
        }),
      });
    }

    initAngularBootstrap();

    const app: App = {
      id,
      title,
      order: 9002,
      appRoute: path,
      euiIconType: icon,
      category: DEFAULT_APP_CATEGORIES.management,
      mount: async (context: AppMountContext, params: AppMountParameters) => {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { AngularApp } = await import('./angular');
        const deps: MonitoringPluginDependencies = {
          navigation: pluginsStart.navigation,
          element: params.element,
          core: coreStart,
          data: pluginsStart.data,
          isCloud: Boolean(plugins.cloud?.isCloudEnabled),
          pluginInitializerContext: this.initializerContext,
          externalConfig: this.getExternalConfig(),
        };

        this.setInitialTimefilter(deps);
        this.overrideAlertingEmailDefaults(deps);

        const monitoringApp = new AngularApp(deps);
        return monitoringApp.destroy;
      },
    };

    core.application.register(app);
  }

  public start(core: CoreStart, plugins: any) {}

  public stop() {}

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
    uiSettings.overrideLocalDefault('timepicker:timeDefaults', JSON.stringify(time));
  }

  private overrideAlertingEmailDefaults({ core: coreContext }: MonitoringPluginDependencies) {
    const { uiSettings } = coreContext;
    if (KIBANA_ALERTING_ENABLED && !uiSettings.get(MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS)) {
      uiSettings.overrideLocalDefault(
        MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
        JSON.stringify({
          name: i18n.translate('xpack.monitoring.alertingEmailAddress.name', {
            defaultMessage: 'Alerting email address',
          }),
          value: '',
          description: i18n.translate('xpack.monitoring.alertingEmailAddress.description', {
            defaultMessage: `The default email address to receive alerts from Stack Monitoring`,
          }),
          category: ['monitoring'],
        })
      );
    }
  }

  private getExternalConfig() {
    const monitoring = this.initializerContext.config.get();
    return [
      ['minIntervalSeconds', monitoring.ui.min_interval_seconds],
      ['showLicenseExpiration', monitoring.ui.show_license_expiration],
      ['showCgroupMetricsElasticsearch', monitoring.ui.container.elasticsearch.enabled],
      ['showCgroupMetricsLogstash', monitoring.ui.container.logstash.enabled],
    ];
  }
}

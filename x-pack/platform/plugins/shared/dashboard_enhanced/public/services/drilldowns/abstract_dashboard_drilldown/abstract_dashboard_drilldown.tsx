/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaLocation, SharePluginStart } from '@kbn/share-plugin/public';
import React from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  AdvancedUiActionsStart,
  UiActionsEnhancedBaseActionFactoryContext as BaseActionFactoryContext,
  UiActionsEnhancedDrilldownDefinition as Drilldown,
} from '@kbn/ui-actions-enhanced-plugin/public';
import type { CollectConfigProps, StartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS } from '@kbn/presentation-util-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';

import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import { CollectConfigContainer } from './components';
import { txtGoToDashboard } from './i18n';
import type { DashboardDrilldownConfig } from './types';
export interface Params {
  start: StartServicesGetter<{
    uiActionsEnhanced: AdvancedUiActionsStart;
    data: DataPublicPluginStart;
    share: SharePluginStart;
    dashboard: DashboardStart;
  }>;
}

export abstract class AbstractDashboardDrilldown<Context extends object = object>
  implements Drilldown<DashboardDrilldownConfig, Context>
{
  constructor(protected readonly params: Params) {
    this.ReactCollectConfig = (props) => <CollectConfigContainer {...props} params={this.params} />;
    this.CollectConfig = this.ReactCollectConfig;
  }

  public abstract readonly id: string;

  public abstract readonly supportedTriggers: () => string[];

  protected abstract getLocation(
    config: DashboardDrilldownConfig,
    context: Context,
    useUrlForState: boolean
  ): Promise<KibanaLocation>;

  public readonly order = 100;

  public readonly getDisplayName = () => txtGoToDashboard;

  public readonly euiIcon = 'dashboardApp';

  private readonly ReactCollectConfig: React.FC<
    CollectConfigProps<DashboardDrilldownConfig, BaseActionFactoryContext>
  >;

  public readonly CollectConfig: React.FC<
    CollectConfigProps<DashboardDrilldownConfig, BaseActionFactoryContext>
  >;

  public readonly createConfig = () => ({
    dashboardId: '',
    ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
  });

  public readonly isConfigValid = (
    config: DashboardDrilldownConfig
  ): config is DashboardDrilldownConfig => {
    if (!config.dashboardId) return false;
    return true;
  };

  public readonly getHref = async (
    config: DashboardDrilldownConfig,
    context: Context
  ): Promise<string> => {
    const { app, path } = await this.getLocation(config, context, true);
    const url = await this.params.start().core.application.getUrlForApp(app, {
      path,
      absolute: true,
    });
    return url;
  };

  public readonly execute = async (config: DashboardDrilldownConfig, context: Context) => {
    if (config.openInNewTab) {
      window.open(await this.getHref(config, context), '_blank');
    } else {
      const { app, path, state } = await this.getLocation(config, context, false);
      await this.params.start().core.application.navigateToApp(app, { path, state });
    }
  };

  protected get locator() {
    const locator = this.params.start().plugins.share.url.locators.get(DASHBOARD_APP_LOCATOR);
    if (!locator) throw new Error('Dashboard locator is required for dashboard drilldown.');
    return locator;
  }
}

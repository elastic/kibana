/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DashboardEnhancedAbstractDashboardDrilldown as AbstractDashboardDrilldown,
  DashboardEnhancedAbstractDashboardDrilldownConfig as Config,
} from '@kbn/dashboard-enhanced-plugin/public';
import { KibanaLocation } from '@kbn/share-plugin/public';
import { SAMPLE_APP1_CLICK_TRIGGER, SampleApp1ClickContext } from '../../triggers';

export const APP1_TO_DASHBOARD_DRILLDOWN = 'APP1_TO_DASHBOARD_DRILLDOWN';

type Context = SampleApp1ClickContext;

export class App1ToDashboardDrilldown extends AbstractDashboardDrilldown<Context> {
  public readonly id = APP1_TO_DASHBOARD_DRILLDOWN;

  public readonly supportedTriggers = () => [SAMPLE_APP1_CLICK_TRIGGER];

  protected async getLocation(config: Config, context: Context): Promise<KibanaLocation> {
    const location = await this.locator.getLocation({
      dashboardId: config.dashboardId,
    });

    return location;
  }
}

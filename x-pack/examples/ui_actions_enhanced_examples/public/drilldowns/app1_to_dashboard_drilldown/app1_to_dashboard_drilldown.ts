/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardDrilldownConfig } from '@kbn/dashboard-enhanced-plugin/public';
import { DashboardEnhancedAbstractDashboardDrilldown as AbstractDashboardDrilldown } from '@kbn/dashboard-enhanced-plugin/public';
import type { KibanaLocation } from '@kbn/share-plugin/public';
import type { SampleApp1ClickContext } from '../../triggers';
import { SAMPLE_APP1_CLICK_TRIGGER } from '../../triggers';

export const APP1_TO_DASHBOARD_DRILLDOWN = 'APP1_TO_DASHBOARD_DRILLDOWN';

type Context = SampleApp1ClickContext;

export class App1ToDashboardDrilldown extends AbstractDashboardDrilldown<Context> {
  public readonly id = APP1_TO_DASHBOARD_DRILLDOWN;

  public readonly supportedTriggers = () => [SAMPLE_APP1_CLICK_TRIGGER];

  protected async getLocation(
    config: DashboardDrilldownConfig,
    context: Context
  ): Promise<KibanaLocation> {
    const location = await this.locator.getLocation({
      dashboardId: config.dashboardId,
    });

    return location;
  }
}

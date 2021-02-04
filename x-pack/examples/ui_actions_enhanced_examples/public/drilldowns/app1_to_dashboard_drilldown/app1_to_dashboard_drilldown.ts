/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DashboardEnhancedAbstractDashboardDrilldown as AbstractDashboardDrilldown,
  DashboardEnhancedAbstractDashboardDrilldownConfig as Config,
} from '../../../../../plugins/dashboard_enhanced/public';
import { SAMPLE_APP1_CLICK_TRIGGER, SampleApp1ClickContext } from '../../triggers';
import { KibanaURL } from '../../../../../../src/plugins/share/public';

export const APP1_TO_DASHBOARD_DRILLDOWN = 'APP1_TO_DASHBOARD_DRILLDOWN';

type Context = SampleApp1ClickContext;

export class App1ToDashboardDrilldown extends AbstractDashboardDrilldown<Context> {
  public readonly id = APP1_TO_DASHBOARD_DRILLDOWN;

  public readonly supportedTriggers = () => [SAMPLE_APP1_CLICK_TRIGGER];

  protected async getURL(config: Config, context: Context): Promise<KibanaURL> {
    const path = await this.urlGenerator.createUrl({
      dashboardId: config.dashboardId,
    });
    const url = new KibanaURL(path);

    return url;
  }
}

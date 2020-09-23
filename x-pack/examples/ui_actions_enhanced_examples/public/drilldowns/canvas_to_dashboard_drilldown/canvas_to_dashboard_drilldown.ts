/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DashboardEnhancedAbstractDashboardDrilldown as AbstractDashboardDrilldown,
  DashboardEnhancedAbstractDashboardDrilldownConfig as Config,
} from '../../../../../plugins/dashboard_enhanced/public';
import {
  SAMPLE_CANVAS_ELEMENT_CLICK_TRIGGER,
  SampleCanvasElementClickContext,
} from '../../triggers';
import { KibanaURL } from '../../../../../../src/plugins/share/public';

export const SAMPLE_CANVAS_TO_DASHBOARD_DRILLDOWN = 'SAMPLE_CANVAS_TO_DASHBOARD_DRILLDOWN';

type Trigger = typeof SAMPLE_CANVAS_ELEMENT_CLICK_TRIGGER;
type Context = SampleCanvasElementClickContext;

export class SampleCanvasToDashboardDrilldown extends AbstractDashboardDrilldown<Trigger> {
  public readonly id = SAMPLE_CANVAS_TO_DASHBOARD_DRILLDOWN;

  public readonly supportedTriggers = () => [SAMPLE_CANVAS_ELEMENT_CLICK_TRIGGER] as Trigger[];

  protected async getURL(config: Config, context: Context): Promise<KibanaURL> {
    const path = await this.urlGenerator.createUrl({
      dashboardId: config.dashboardId,
    });
    const url = new KibanaURL(path);

    return url;
  }
}

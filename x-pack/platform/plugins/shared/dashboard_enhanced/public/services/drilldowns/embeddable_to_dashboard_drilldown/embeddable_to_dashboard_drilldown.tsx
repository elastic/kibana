/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { extractTimeRange, isFilterPinned } from '@kbn/es-query';
import type { HasParentApi, PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { KibanaLocation } from '@kbn/share-plugin/public';
import {
  cleanEmptyKeys,
  getDashboardLocatorParamsFromEmbeddable,
} from '@kbn/dashboard-plugin/public';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import {
  APPLY_FILTER_TRIGGER,
  IMAGE_CLICK_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { AbstractDashboardDrilldownParams } from '../abstract_dashboard_drilldown';
import { AbstractDashboardDrilldown } from '../abstract_dashboard_drilldown';
import { EMBEDDABLE_TO_DASHBOARD_DRILLDOWN } from './constants';
import type { DashboardDrilldownConfig } from '../abstract_dashboard_drilldown';

export type Context = ApplyGlobalFilterActionContext & {
  embeddable: Partial<PublishesUnifiedSearch & HasParentApi<Partial<PublishesUnifiedSearch>>>;
};
export type Params = AbstractDashboardDrilldownParams;

/**
 * This drilldown is the "Go to Dashboard" you can find in Dashboard app panles.
 * This drilldown can be used on any embeddable and it is tied to embeddables
 * in two ways: (1) it works with APPLY_FILTER_TRIGGER, which is usually executed
 * by embeddables (but not necessarily); (2) its `getURL` method depends on
 * `embeddable` field being present in `context`.
 */
export class EmbeddableToDashboardDrilldown extends AbstractDashboardDrilldown<Context> {
  public readonly id = EMBEDDABLE_TO_DASHBOARD_DRILLDOWN;

  public readonly supportedTriggers = () => [APPLY_FILTER_TRIGGER, IMAGE_CLICK_TRIGGER];

  protected async getLocation(
    config: DashboardDrilldownConfig,
    context: Context,
    useUrlForState: boolean
  ): Promise<KibanaLocation> {
    let params: DashboardLocatorParams = { dashboardId: config.dashboardId };

    if (context.embeddable) {
      params = {
        ...params,
        ...getDashboardLocatorParamsFromEmbeddable(context.embeddable, config),
      };
    }

    /** Get event params */
    const { restOfFilters: filtersFromEvent, timeRange: timeRangeFromEvent } = extractTimeRange(
      context.filters,
      context.timeFieldName
    );

    if (filtersFromEvent) {
      params.filters = [...(params.filters ?? []), ...filtersFromEvent];
    }

    if (timeRangeFromEvent) {
      params.time_range = timeRangeFromEvent;
    }

    const location = await this.locator.getLocation(params);
    if (useUrlForState) {
      this.useUrlForState(location);
    }

    return location;
  }

  private useUrlForState(location: KibanaLocation<DashboardLocatorParams>) {
    const state = location.state;
    location.path = setStateToKbnUrl(
      '_a',
      cleanEmptyKeys({
        query: state.query,
        filters: state.filters?.filter((f) => !isFilterPinned(f)),
      }),
      { useHash: false, storeInHashQuery: true },
      location.path
    );
  }
}

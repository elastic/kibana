/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/public';
import { extractTimeRange, isFilterPinned, type Query } from '@kbn/es-query';
import type { HasParentApi, PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import type { DashboardDrilldownOptions } from '@kbn/presentation-util-plugin/public';
import { cleanEmptyKeys, setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { AbstractDashboardDrilldownConfig as Config } from '../abstract_dashboard_drilldown';
import type { Context } from './embeddable_to_dashboard_drilldown';

const getDashboardLocatorParamsFromEmbeddable = (
  api: Partial<PublishesUnifiedSearch & HasParentApi<Partial<PublishesUnifiedSearch>>>,
  options: DashboardDrilldownOptions
): Partial<DashboardLocatorParams> => {
  const params: DashboardLocatorParams = {};

  const query = api.parentApi?.query$?.value;
  if (query && options.useCurrentFilters) {
    params.query = query as Query;
  }

  // if useCurrentDashboardDataRange is enabled, then preserve current time range
  // if undefined is passed, then destination dashboard will figure out time range itself
  // for brush event this time range would be overwritten
  const timeRange = api.timeRange$?.value ?? api.parentApi?.timeRange$?.value;
  if (timeRange && options.useCurrentDateRange) {
    params.timeRange = timeRange;
  }

  // if useCurrentDashboardFilters enabled, then preserve all the filters (pinned, unpinned, and from controls)
  // otherwise preserve only pinned
  const filters = api.parentApi?.filters$?.value ?? [];
  params.filters = options.useCurrentFilters ? filters : filters?.filter((f) => isFilterPinned(f));

  return params;
};

export async function getLocation(
  dashboardLocator: LocatorPublic<SerializableRecord>,
  config: Config,
  context: Context,
  useUrlForState: boolean
) {
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
    params.timeRange = timeRangeFromEvent;
  }

  const location = await dashboardLocator.getLocation(params);
  if (useUrlForState) {
    const state = location.state as DashboardLocatorParams;
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

  return location;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMResolver } from '../../../common/graphql/resolver_types';
import { GetMonitorChartsDataQueryArgs, MonitorChart } from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { CreateUMGraphQLResolvers, UMContext } from '../types';

export type UMGetMonitorChartsResolver = UMResolver<
  any | Promise<any>,
  any,
  GetMonitorChartsDataQueryArgs,
  UMContext
>;

export const createMonitorsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    getMonitorChartsData: UMGetMonitorChartsResolver;
  };
} => ({
  Query: {
    async getMonitorChartsData(
      _resolver,
      { monitorId, dateRangeStart, dateRangeEnd, location },
      { APICaller }
    ): Promise<MonitorChart> {
      return libs.monitors.getMonitorChartsData({
        callES: APICaller,
        monitorId,
        dateRangeStart,
        dateRangeEnd,
        location,
      });
    },
  },
});

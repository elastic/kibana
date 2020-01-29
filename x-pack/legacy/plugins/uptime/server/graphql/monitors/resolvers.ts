/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange } from '../../../common/domain_types';
import { UMResolver } from '../../../common/graphql/resolver_types';
import {
  GetFilterBarQueryArgs,
  GetMonitorChartsDataQueryArgs,
  MonitorChart,
  GetSnapshotHistogramQueryArgs,
} from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { CreateUMGraphQLResolvers, UMContext } from '../types';
import { HistogramResult } from '../../../common/domain_types';

export type UMMonitorsResolver = UMResolver<any | Promise<any>, any, UMGqlRange, UMContext>;

export type UMGetMonitorChartsResolver = UMResolver<
  any | Promise<any>,
  any,
  GetMonitorChartsDataQueryArgs,
  UMContext
>;

export type UMGetFilterBarResolver = UMResolver<
  any | Promise<any>,
  any,
  GetFilterBarQueryArgs,
  UMContext
>;

export type UMGetSnapshotHistogram = UMResolver<
  HistogramResult | Promise<HistogramResult>,
  any,
  GetSnapshotHistogramQueryArgs,
  UMContext
>;

export const createMonitorsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    getSnapshotHistogram: UMGetSnapshotHistogram;
    getMonitorChartsData: UMGetMonitorChartsResolver;
  };
} => ({
  Query: {
    async getSnapshotHistogram(
      _resolver,
      { dateRangeStart, dateRangeEnd, filters, monitorId, statusFilter },
      { APICaller }
    ): Promise<HistogramResult> {
      return await libs.requests.getPingHistogram({
        callES: APICaller,
        dateRangeStart,
        dateRangeEnd,
        filters,
        monitorId,
        statusFilter,
      });
    },
    async getMonitorChartsData(
      _resolver,
      { monitorId, dateRangeStart, dateRangeEnd, location },
      { APICaller }
    ): Promise<MonitorChart> {
      return await libs.requests.getMonitorCharts({
        callES: APICaller,
        monitorId,
        dateRangeStart,
        dateRangeEnd,
        location,
      });
    },
  },
});

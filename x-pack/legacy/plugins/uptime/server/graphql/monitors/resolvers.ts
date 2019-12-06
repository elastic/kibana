/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange } from '../../../common/domain_types';
import { UMResolver } from '../../../common/graphql/resolver_types';
import {
  FilterBar,
  GetFilterBarQueryArgs,
  GetLatestMonitorsQueryArgs,
  GetMonitorChartsDataQueryArgs,
  GetMonitorPageTitleQueryArgs,
  MonitorChart,
  MonitorPageTitle,
  Ping,
  GetSnapshotHistogramQueryArgs,
} from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { CreateUMGraphQLResolvers, UMContext } from '../types';
import { HistogramResult } from '../../../common/domain_types';

export type UMMonitorsResolver = UMResolver<any | Promise<any>, any, UMGqlRange, UMContext>;

export type UMLatestMonitorsResolver = UMResolver<
  Ping[] | Promise<Ping[]>,
  any,
  GetLatestMonitorsQueryArgs,
  UMContext
>;

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

export type UMGetMontiorPageTitleResolver = UMResolver<
  MonitorPageTitle | Promise<MonitorPageTitle | null> | null,
  any,
  GetMonitorPageTitleQueryArgs,
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
    getLatestMonitors: UMLatestMonitorsResolver;
    getFilterBar: UMGetFilterBarResolver;
    getMonitorPageTitle: UMGetMontiorPageTitleResolver;
  };
} => ({
  Query: {
    async getSnapshotHistogram(
      _resolver,
      { dateRangeStart, dateRangeEnd, filters, monitorId, statusFilter },
      { callAsCurrentUser }
    ): Promise<HistogramResult> {
      return await libs.pings.getPingHistogram({
        callES: callAsCurrentUser,
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
      { callAsCurrentUser }
    ): Promise<MonitorChart> {
      return await libs.monitors.getMonitorChartsData({
        callES: callAsCurrentUser,
        monitorId,
        dateRangeStart,
        dateRangeEnd,
        location,
      });
    },
    async getLatestMonitors(
      _resolver,
      { dateRangeStart, dateRangeEnd, monitorId, location },
      { callAsCurrentUser }
    ): Promise<Ping[]> {
      return await libs.pings.getLatestMonitorDocs({
        callES: callAsCurrentUser,
        dateRangeStart,
        dateRangeEnd,
        monitorId,
        location,
      });
    },
    async getFilterBar(
      _resolver,
      { dateRangeStart, dateRangeEnd },
      { callAsCurrentUser }
    ): Promise<FilterBar> {
      return await libs.monitors.getFilterBar({
        callES: callAsCurrentUser,
        dateRangeStart,
        dateRangeEnd,
      });
    },
    async getMonitorPageTitle(
      _resolver: any,
      { monitorId },
      { callAsCurrentUser }
    ): Promise<MonitorPageTitle | null> {
      return await libs.monitors.getMonitorPageTitle({ callES: callAsCurrentUser, monitorId });
    },
  },
});

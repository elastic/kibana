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
  GetMonitorChartsDataQueryArgs,
  GetMonitorPageTitleQueryArgs,
  MonitorChart,
  MonitorPageTitle,
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

export type UMGetMonitorPageTitleResolver = UMResolver<
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
    getFilterBar: UMGetFilterBarResolver;
    getMonitorPageTitle: UMGetMonitorPageTitleResolver;
  };
} => ({
  Query: {
    async getSnapshotHistogram(
      resolver,
      { dateRangeStart, dateRangeEnd, filters, monitorId, statusFilter },
      { req }
    ): Promise<HistogramResult> {
      return await libs.pings.getPingHistogram(
        req,
        dateRangeStart,
        dateRangeEnd,
        filters,
        monitorId,
        statusFilter
      );
    },
    async getMonitorChartsData(
      resolver,
      { monitorId, dateRangeStart, dateRangeEnd, location },
      { req }
    ): Promise<MonitorChart> {
      return await libs.monitors.getMonitorChartsData(
        req,
        monitorId,
        dateRangeStart,
        dateRangeEnd,
        location
      );
    },
    async getFilterBar(resolver, { dateRangeStart, dateRangeEnd }, { req }): Promise<FilterBar> {
      return await libs.monitors.getFilterBar(req, dateRangeStart, dateRangeEnd);
    },
    async getMonitorPageTitle(
      resolver: any,
      { monitorId },
      { req }
    ): Promise<MonitorPageTitle | null> {
      return await libs.monitors.getMonitorPageTitle(req, monitorId);
    },
  },
});

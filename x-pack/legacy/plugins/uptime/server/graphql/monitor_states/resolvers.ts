/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateUMGraphQLResolvers, UMContext } from '../types';
import { UMServerLibs } from '../../lib/lib';
import { UMResolver } from '../../../common/graphql/resolver_types';
import {
  GetMonitorStatesQueryArgs,
  MonitorSummaryResult,
  StatesIndexStatus,
  GetStatesIndexStatusQueryArgs,
} from '../../../common/graphql/types';

export type UMGetMonitorStatesResolver = UMResolver<
  MonitorSummaryResult | Promise<MonitorSummaryResult>,
  any,
  GetMonitorStatesQueryArgs,
  UMContext
>;

export type UMStatesIndexExistsResolver = UMResolver<
  StatesIndexStatus | Promise<StatesIndexStatus>,
  any,
  GetStatesIndexStatusQueryArgs,
  UMContext
>;

export const createMonitorStatesResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    getMonitorStates: UMGetMonitorStatesResolver;
    getStatesIndexStatus: UMStatesIndexExistsResolver;
  };
} => {
  return {
    Query: {
      async getMonitorStates(
        resolver,
        { dateRangeStart, dateRangeEnd, filters },
        { req }
      ): Promise<MonitorSummaryResult> {
        const [
          // TODO: rely on new summaries adapter function once continuous data frame is available
          // summaries,
          totalSummaryCount,
          legacySummaries,
        ] = await Promise.all([
          // TODO: rely on new summaries adapter function once continuous data frame is available
          // libs.monitorStates.getMonitorStates(req, pageIndex, pageSize, sortField, sortDirection),
          libs.pings.getDocCount(req),
          libs.monitorStates.legacyGetMonitorStates(req, dateRangeStart, dateRangeEnd, filters),
        ]);
        return {
          summaries: legacySummaries,
          totalSummaryCount,
        };
      },
      async getStatesIndexStatus(
        resolver,
        { dateRangeStart, dateRangeEnd, filters },
        { req }
      ): Promise<StatesIndexStatus> {
        const indexExists = await libs.monitorStates.statesIndexExists(req);
        let summaryCount: { up: number; down: number } | undefined;
        if (indexExists) {
          // TODO: provide count of states index in future release
          summaryCount = await libs.monitorStates.getSummaryCount(
            req,
            dateRangeStart,
            dateRangeEnd,
            filters
          );
        }
        return {
          indexExists,
          docCount: {
            count: summaryCount ? summaryCount.up + summaryCount.down : undefined,
          },
        };
      },
    },
  };
};

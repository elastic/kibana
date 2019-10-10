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
} from '../../../common/graphql/types';
import { CONTEXT_DEFAULTS } from '../../../common/constants/context_defaults';

export type UMGetMonitorStatesResolver = UMResolver<
  MonitorSummaryResult | Promise<MonitorSummaryResult>,
  any,
  GetMonitorStatesQueryArgs,
  UMContext
>;

export type UMStatesIndexExistsResolver = UMResolver<
  StatesIndexStatus | Promise<StatesIndexStatus>,
  any,
  {},
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
        { dateRangeStart, dateRangeEnd, filters, pagination, statusFilter },
        { req }
      ): Promise<MonitorSummaryResult> {
        const decodedPagination = pagination
          ? JSON.parse(decodeURIComponent(pagination))
          : CONTEXT_DEFAULTS.CURSOR_PAGINATION;
        const [
          totalSummaryCount,
          { summaries, nextPagePagination, prevPagePagination },
        ] = await Promise.all([
          libs.pings.getDocCount(req),
          libs.monitorStates.getMonitorStates(
            req,
            dateRangeStart,
            dateRangeEnd,
            decodedPagination,
            filters,
            statusFilter
          ),
        ]);
        return {
          summaries,
          nextPagePagination,
          prevPagePagination,
          totalSummaryCount,
        };
      },
      async getStatesIndexStatus(resolver, {}, { req }): Promise<StatesIndexStatus> {
        return await libs.monitorStates.statesIndexExists(req);
      },
    },
  };
};

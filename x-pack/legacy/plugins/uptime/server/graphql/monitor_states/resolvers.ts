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
        { dateRangeStart, dateRangeEnd, filters, pagination },
        { req }
      ): Promise<MonitorSummaryResult> {
        const [totalSummaryCount, { summaries, isFinalPage }] = await Promise.all([
          libs.pings.getDocCount(req),
          libs.monitorStates.getMonitorStates(
            req,
            dateRangeStart,
            dateRangeEnd,
            pagination || undefined,
            filters
          ),
        ]);
        return {
          isFinalPage,
          summaries,
          totalSummaryCount,
        };
      },
      async getStatesIndexStatus(resolver, {}, { req }): Promise<StatesIndexStatus> {
        return await libs.monitorStates.statesIndexExists(req);
      },
    },
  };
};

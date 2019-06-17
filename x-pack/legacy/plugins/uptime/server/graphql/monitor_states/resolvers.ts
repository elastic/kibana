/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateUMGraphQLResolvers, UMContext } from '../types';
import { UMServerLibs } from '../../lib/lib';
import { UMResolver } from '../../../common/graphql/resolver_types';
import { GetMonitorStatesQueryArgs, MonitorSummaryResult } from '../../../common/graphql/types';

export type UMGetMonitorStatesResolver = UMResolver<
  MonitorSummaryResult | Promise<MonitorSummaryResult>,
  any,
  GetMonitorStatesQueryArgs,
  UMContext
>;

export const createMonitorStatesResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: { getMonitorStates: UMGetMonitorStatesResolver };
} => {
  return {
    Query: {
      async getMonitorStates(
        resolver,
        { pageIndex, pageSize, sortField, sortDirection },
        { req }
      ): Promise<MonitorSummaryResult> {
        const [summaries, totalSummaryCount] = await Promise.all([
          libs.monitorStates.getMonitorStates(req, pageIndex, pageSize, sortField, sortDirection),
          libs.monitorStates.getSummaryCount(req),
        ]);
        return {
          summaries,
          totalSummaryCount,
        };
      },
    },
  };
};

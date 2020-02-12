/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMResolver } from '../../../common/graphql/resolver_types';
import { AllPingsQueryArgs, PingResults } from '../../../common/graphql/types';
import { UMServerLibs } from '../../lib/lib';
import { UMContext } from '../types';
import { CreateUMGraphQLResolvers } from '../types';

export type UMAllPingsResolver = UMResolver<
  PingResults | Promise<PingResults>,
  any,
  AllPingsQueryArgs,
  UMContext
>;

export interface UMPingResolver {
  allPings: () => PingResults;
}

export const createPingsResolvers: CreateUMGraphQLResolvers = (
  libs: UMServerLibs
): {
  Query: {
    allPings: UMAllPingsResolver;
  };
} => ({
  Query: {
    async allPings(
      _resolver,
      { monitorId, sort, size, status, dateRangeStart, dateRangeEnd, location },
      { APICaller }
    ): Promise<PingResults> {
      return await libs.requests.getPings({
        callES: APICaller,
        dateRangeStart,
        dateRangeEnd,
        monitorId,
        status,
        sort,
        size,
        location,
      });
    },
  },
});

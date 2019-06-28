/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { KpiNetwork } from '../../lib/kpi_network';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

export type QueryKipNetworkResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.KpiNetworkResolver>,
  QuerySourceResolver
>;

export type QueryKipIpDetailsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.KpiIpDetailsResolver>,
  QuerySourceResolver
>;

export interface KpiNetworkResolversDeps {
  kpiNetwork: KpiNetwork;
}

export const createKpiNetworkResolvers = (
  libs: KpiNetworkResolversDeps
): {
  Source: {
    KpiNetwork: QueryKipNetworkResolver;
    KpiIpDetails: QueryKipIpDetailsResolver;
  };
} => ({
  Source: {
    async KpiNetwork(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info) };
      return libs.kpiNetwork.getKpiNetwork(req, options);
    },
    async KpiIpDetails(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info) };
      return libs.kpiNetwork.getKpiIpDetails(req, options);
    },
  },
});

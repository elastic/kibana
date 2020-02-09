/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { Network } from '../../lib/network';
import { createOptionsPaginated, createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryNetworkTopCountriesResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.NetworkTopCountriesResolver>,
  QuerySourceResolver
>;

type QueryNetworkTopNFlowResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.NetworkTopNFlowResolver>,
  QuerySourceResolver
>;

type QueryNetworkHttpResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.NetworkHttpResolver>,
  QuerySourceResolver
>;

type QueryDnsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.NetworkDnsResolver>,
  QuerySourceResolver
>;

type QueryDnsHistogramResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.NetworkDnsHistogramResolver>,
  QuerySourceResolver
>;
export interface NetworkResolversDeps {
  network: Network;
}

export const createNetworkResolvers = (
  libs: NetworkResolversDeps
): {
  Source: {
    NetworkHttp: QueryNetworkHttpResolver;
    NetworkTopCountries: QueryNetworkTopCountriesResolver;
    NetworkTopNFlow: QueryNetworkTopNFlowResolver;
    NetworkDns: QueryDnsResolver;
    NetworkDnsHistogram: QueryDnsHistogramResolver;
  };
} => ({
  Source: {
    async NetworkTopCountries(source, args, { req }, info) {
      const options = {
        ...createOptionsPaginated(source, args, info),
        flowTarget: args.flowTarget,
        networkTopCountriesSort: args.sort,
        ip: args.ip,
      };
      return libs.network.getNetworkTopCountries(req, options);
    },
    async NetworkTopNFlow(source, args, { req }, info) {
      const options = {
        ...createOptionsPaginated(source, args, info),
        flowTarget: args.flowTarget,
        networkTopNFlowSort: args.sort,
        ip: args.ip,
      };
      return libs.network.getNetworkTopNFlow(req, options);
    },
    async NetworkHttp(source, args, { req }, info) {
      const options = {
        ...createOptionsPaginated(source, args, info),
        networkHttpSort: args.sort,
        ip: args.ip,
      };
      return libs.network.getNetworkHttp(req, options);
    },
    async NetworkDns(source, args, { req }, info) {
      const options = {
        ...createOptionsPaginated(source, args, info),
        networkDnsSortField: args.sort,
        isPtrIncluded: args.isPtrIncluded,
      };
      return libs.network.getNetworkDns(req, options);
    },
    async NetworkDnsHistogram(source, args, { req }, info) {
      const options = {
        ...createOptions(source, args, info),
        stackByField: args.stackByField,
      };
      return libs.network.getNetworkDnsHistogramData(req, options);
    },
  },
});

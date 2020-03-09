/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { Network } from '../../lib/network';
import { createOptionsPaginated } from '../../utils/build_query/create_options';

export interface NetworkResolversDeps {
  network: Network;
}

export const createNetworkResolvers = (
  libs: NetworkResolversDeps
): {
  Source: {
    NetworkHttp: SourceResolvers['NetworkHttp'];
    NetworkTopCountries: SourceResolvers['NetworkTopCountries'];
    NetworkTopNFlow: SourceResolvers['NetworkTopNFlow'];
    NetworkDns: SourceResolvers['NetworkDns'];
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
  },
});

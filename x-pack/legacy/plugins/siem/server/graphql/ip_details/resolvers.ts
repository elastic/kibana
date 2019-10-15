/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { IpDetails, TlsRequestOptions, UsersRequestOptions } from '../../lib/ip_details';
import { createOptions, createOptionsPaginated } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

export type QueryIpOverviewResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.IpOverviewResolver>,
  QuerySourceResolver
>;

export type QueryTlsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.TlsResolver>,
  QuerySourceResolver
>;

export type QueryUsersResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.UsersResolver>,
  QuerySourceResolver
>;

export interface IDetailsResolversDeps {
  ipDetails: IpDetails;
}

export const createIpDetailsResolvers = (
  libs: IDetailsResolversDeps
): {
  Source: {
    IpOverview: QueryIpOverviewResolver;
    Tls: QueryTlsResolver;
    Users: QueryUsersResolver;
  };
} => ({
  Source: {
    async IpOverview(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info), ip: args.ip };
      return libs.ipDetails.getIpOverview(req, options);
    },
    async Tls(source, args, { req }, info) {
      const options: TlsRequestOptions = {
        ...createOptionsPaginated(source, args, info),
        ip: args.ip,
        tlsSortField: args.sort,
        flowTarget: args.flowTarget,
      };
      return libs.ipDetails.getTls(req, options);
    },
    async Users(source, args, { req }, info) {
      const options: UsersRequestOptions = {
        ...createOptionsPaginated(source, args, info),
        ip: args.ip,
        usersSortField: args.sort,
        flowTarget: args.flowTarget,
      };
      return libs.ipDetails.getUsers(req, options);
    },
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { IpDetails, UsersRequestOptions } from '../../lib/ip_details';
import { createOptions, createOptionsPaginated } from '../../utils/build_query/create_options';

export interface IDetailsResolversDeps {
  ipDetails: IpDetails;
}

export const createIpDetailsResolvers = (
  libs: IDetailsResolversDeps
): {
  Source: {
    IpOverview: SourceResolvers['IpOverview'];
    Users: SourceResolvers['Users'];
  };
} => ({
  Source: {
    async IpOverview(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info), ip: args.ip };
      return libs.ipDetails.getIpOverview(req, options);
    },
    async Users(source, args, { req }, info) {
      const options: UsersRequestOptions = {
        ...createOptionsPaginated(source, args, info),
        ip: args.ip,
        sort: args.sort,
        flowTarget: args.flowTarget,
      };
      return libs.ipDetails.getUsers(req, options);
    },
  },
});

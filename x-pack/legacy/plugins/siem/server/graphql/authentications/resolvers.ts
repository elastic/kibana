/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { Authentications } from '../../lib/authentications';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { createOptionsPaginated, createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';

type QueryAuthenticationsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.AuthenticationsResolver>,
  QuerySourceResolver
>;

type QueryAuthenticationsOverTimeResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.AuthenticationsHistogramResolver>,
  QuerySourceResolver
>;

export interface AuthenticationsResolversDeps {
  authentications: Authentications;
}

export const createAuthenticationsResolvers = (
  libs: AuthenticationsResolversDeps
): {
  Source: {
    Authentications: QueryAuthenticationsResolver;
    AuthenticationsHistogram: QueryAuthenticationsOverTimeResolver;
  };
} => ({
  Source: {
    async Authentications(source, args, { req }, info) {
      const options = createOptionsPaginated(source, args, info);
      return libs.authentications.getAuthentications(req, options);
    },
    async AuthenticationsHistogram(source, args, { req }, info) {
      const options = {
        ...createOptions(source, args, info),
        defaultIndex: args.defaultIndex,
        stackByField: args.stackByField,
      };
      return libs.authentications.getAuthenticationsOverTime(req, options);
    },
  },
});

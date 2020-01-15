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

type QueryMatrixHistogramResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.MatrixHistogramResolver>,
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
    MatrixHistogram: QueryMatrixHistogramResolver;
  };
} => ({
  Source: {
    async Authentications(source, args, { req }, info) {
      const options = createOptionsPaginated(source, args, info);
      return libs.authentications.getAuthentications(req, options);
    },
    async MatrixHistogram(source, args, { req }, info) {
      const options = {
        ...createOptions(source, args, info),
        stackByField: args.stackByField,
        histogramType: args.histogramType,
      };
      return libs.authentications.getAuthenticationsOverTime(req, options);
    },
  },
});

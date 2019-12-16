/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { TLS, TlsRequestOptions } from '../../lib/tls';
import { createOptionsPaginated } from '../../utils/build_query/create_options';

export interface TlsResolversDeps {
  tls: TLS;
}

export const createTlsResolvers = (
  libs: TlsResolversDeps
): {
  Source: {
    Tls: SourceResolvers['Tls'];
  };
} => ({
  Source: {
    async Tls(source, args, { req }, info) {
      const options: TlsRequestOptions = {
        ...createOptionsPaginated(source, args, info),
        ip: args.ip,
        sort: args.sort,
        flowTarget: args.flowTarget,
      };
      return libs.tls.getTls(req, options);
    },
  },
});

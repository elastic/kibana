/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../graphql/types';
import { Overview } from '../../lib/overview';
import { createOptions } from '../../utils/build_query/create_options';

export interface OverviewResolversDeps {
  overview: Overview;
}

export const createOverviewResolvers = (
  libs: OverviewResolversDeps
): {
  Source: {
    OverviewHost: SourceResolvers['OverviewHost'];
    OverviewNetwork: SourceResolvers['OverviewNetwork'];
  };
} => ({
  Source: {
    async OverviewNetwork(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info) };
      return libs.overview.getOverviewNetwork(req, options);
    },
    async OverviewHost(source, args, { req }, info) {
      const options = { ...createOptions(source, args, info) };
      return libs.overview.getOverviewHost(req, options);
    },
  },
});

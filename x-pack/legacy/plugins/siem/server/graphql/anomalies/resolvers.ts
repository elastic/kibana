/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Anomalies } from '../../lib/anomalies';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';
import { SourceResolvers } from '../types';

export interface AnomaliesResolversDeps {
  anomalies: Anomalies;
}

type QueryAnomaliesOverTimeResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.AnomaliesHistogramResolver>,
  QuerySourceResolver
>;

export const createAnomaliesResolvers = (
  libs: AnomaliesResolversDeps
): {
  Source: {
    AnomaliesHistogram: QueryAnomaliesOverTimeResolver;
  };
} => ({
  Source: {
    async AnomaliesHistogram(source, args, { req }, info) {
      const options = {
        ...createOptions(source, args, info),
        defaultIndex: args.defaultIndex,
      };
      return libs.anomalies.getAnomaliesOverTime(req, options);
    },
  },
});

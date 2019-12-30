/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Alerts } from '../../lib/alerts';
import { AppResolverOf, ChildResolverOf } from '../../lib/framework';
import { createOptions } from '../../utils/build_query/create_options';
import { QuerySourceResolver } from '../sources/resolvers';
import { SourceResolvers } from '../types';

export interface AlertsResolversDeps {
  alerts: Alerts;
}

type QueryAlertsHistogramResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.AlertsHistogramResolver>,
  QuerySourceResolver
>;

export const createAlertsResolvers = (
  libs: AlertsResolversDeps
): {
  Source: {
    AlertsHistogram: QueryAlertsHistogramResolver;
  };
} => ({
  Source: {
    async AlertsHistogram(source, args, { req }, info) {
      const options = {
        ...createOptions(source, args, info),
        defaultIndex: args.defaultIndex,
      };
      return libs.alerts.getAlertsHistogramData(req, options);
    },
  },
});

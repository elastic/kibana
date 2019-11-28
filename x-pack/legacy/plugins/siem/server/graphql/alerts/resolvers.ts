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

type QueryAlertsResolver = ChildResolverOf<
  AppResolverOf<SourceResolvers.AlertsResolver>,
  QuerySourceResolver
>;

export const createAlertsResolvers = (
  libs: AlertsResolversDeps
): {
  Source: {
    Alerts: QueryAlertsResolver;
  };
} => ({
  Source: {
    async Alerts(source, args, { req }, info) {
      const options = createOptions(source, args, info, 'edges.node.ecs.');
      return libs.alerts.getAlertsData(req, { ...options, fieldRequested: args.fieldRequested });
    },
  },
});

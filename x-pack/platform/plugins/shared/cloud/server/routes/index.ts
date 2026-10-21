/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { setPostCloudSolutionDataRoute } from './set_cloud_data_route';
import type { CloudRequestHandlerContext } from './types';
import { setElasticsearchRoute } from './elasticsearch_route';
import { setGetCloudSolutionDataRoute } from './get_cloud_data_route';
import { setGetBillingAccessRoute } from './billing_access_route';
import type { BillingAccessChecker } from '../plugin';

export interface RouteOptions {
  logger: Logger;
  router: IRouter<CloudRequestHandlerContext>;
  elasticsearchUrl?: string;
  getBillingAccessChecker: () => BillingAccessChecker | undefined;
}

export function defineRoutes(opts: RouteOptions) {
  setElasticsearchRoute(opts);
  setGetCloudSolutionDataRoute(opts);
  setPostCloudSolutionDataRoute(opts);
  setGetBillingAccessRoute(opts);
}

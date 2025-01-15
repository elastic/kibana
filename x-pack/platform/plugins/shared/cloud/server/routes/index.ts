/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { setPostCloudSolutionDataRoute } from './set_cloud_data_route';
import { CloudRequestHandlerContext } from './types';
import { setElasticsearchRoute } from './elasticsearch_route';
import { setGetCloudSolutionDataRoute } from './get_cloud_data_route';

export interface RouteOptions {
  logger: Logger;
  router: IRouter<CloudRequestHandlerContext>;
  elasticsearchUrl?: string;
}

export function defineRoutes(opts: RouteOptions) {
  const { logger, elasticsearchUrl, router } = opts;

  setElasticsearchRoute({ logger, elasticsearchUrl, router });
  setGetCloudSolutionDataRoute({ logger, router });
  setPostCloudSolutionDataRoute({ logger, router });
}

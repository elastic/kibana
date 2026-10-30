/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreAuthenticationService, IRouter, Logger } from '@kbn/core/server';
import type { TaskRunnerServiceClient } from '../service_client';

export interface RouteDependencies {
  router: IRouter;
  logger: Logger;
  projectId: string;
  serviceClient: TaskRunnerServiceClient;
  getApiKeys: () => Promise<CoreAuthenticationService['apiKeys']>;
}

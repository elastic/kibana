/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import { registerEcfVersionRoute } from './routes/ecf_version';

/** Registers the AWS provider's server-side HTTP routes. */
export const registerAwsRoutes = (router: IRouter, logger: Logger): void => {
  registerEcfVersionRoute(router, logger);
};

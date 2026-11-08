/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import { registerAwsRoutes } from '../providers/aws/register_routes';

type ProviderRouteRegistrar = (router: IRouter, logger: Logger) => void;

const PROVIDER_ROUTE_REGISTRARS: ProviderRouteRegistrar[] = [registerAwsRoutes];

/** Registers all ingest_hub server-side HTTP routes by composing provider registrars. */
export const registerRoutes = (router: IRouter, logger: Logger): void => {
  PROVIDER_ROUTE_REGISTRARS.forEach((register) => register(router, logger));
};

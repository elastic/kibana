/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { AlertingRouteContext } from './alerting_route_context';

export function createAlertingRouteContext(): AlertingRouteContext {
  return {
    response: httpServerMock.createResponseFactory(),
    logger: loggerMock.create(),
  };
}

export function createRouteDependencies() {
  const ctx = createAlertingRouteContext();

  return {
    ctx,
    response: ctx.response as jest.Mocked<KibanaResponseFactory>,
    logger: ctx.logger as jest.Mocked<Logger>,
  };
}

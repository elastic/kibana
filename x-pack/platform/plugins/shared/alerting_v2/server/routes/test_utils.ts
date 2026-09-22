/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import {
  createSettingsService,
  type MockUiSettingsClient,
} from '../lib/services/settings_service/settings_service.mock';
import { createLoggerService } from '../lib/services/logger_service/logger_service.mock';
import type { AlertingRouteContext } from './alerting_route_context';

interface RouteDependencyMocks {
  ctx: AlertingRouteContext;
  response: jest.Mocked<KibanaResponseFactory>;
  mockLogger: jest.Mocked<Logger>;
  mockUiSettingsClient: MockUiSettingsClient;
}

export function createAlertingRouteContext(): {
  ctx: AlertingRouteContext;
  mockLogger: jest.Mocked<Logger>;
  mockUiSettingsClient: MockUiSettingsClient;
} {
  const { settingsService, mockUiSettingsClient } = createSettingsService();
  mockUiSettingsClient.get.mockResolvedValue(true);
  const { loggerService, mockLogger } = createLoggerService();

  const ctx: AlertingRouteContext = {
    response: httpServerMock.createResponseFactory(),
    logger: loggerService.forSubsystem('routes'),
    settings: settingsService,
  };

  return { ctx, mockLogger, mockUiSettingsClient };
}

export function createRouteDependencies(): RouteDependencyMocks {
  const { ctx, mockLogger, mockUiSettingsClient } = createAlertingRouteContext();

  return {
    ctx,
    response: ctx.response as jest.Mocked<KibanaResponseFactory>,
    mockLogger,
    mockUiSettingsClient,
  };
}

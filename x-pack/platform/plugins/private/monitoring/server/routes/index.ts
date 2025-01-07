/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringConfig } from '../config';
import { decorateDebugServer } from '../debug_logger';
import { MonitoringCore, RouteDependencies } from '../types';
import {
  registerV1AlertRoutes,
  registerV1ApmRoutes,
  registerV1BeatsRoutes,
  registerV1CheckAccessRoutes,
  registerV1ClusterRoutes,
  registerV1ElasticsearchRoutes,
  registerV1ElasticsearchSettingsRoutes,
  registerV1EnterpriseSearchRoutes,
  registerV1HealthRoute,
  registerV1LogstashRoutes,
  registerV1SetupRoutes,
  registerV1KibanaRoutes,
} from './api/v1';

export function requireUIRoutes(
  server: MonitoringCore,
  config: MonitoringConfig,
  npRoute: RouteDependencies
) {
  const decoratedServer = config.ui.debug_mode
    ? decorateDebugServer(server, config, npRoute.logger)
    : server;

  registerV1AlertRoutes(decoratedServer, npRoute);
  registerV1ApmRoutes(decoratedServer);
  registerV1BeatsRoutes(decoratedServer);
  registerV1CheckAccessRoutes(decoratedServer);
  registerV1ClusterRoutes(decoratedServer);
  registerV1ElasticsearchRoutes(decoratedServer);
  registerV1ElasticsearchSettingsRoutes(decoratedServer, npRoute);
  registerV1EnterpriseSearchRoutes(decoratedServer);
  registerV1HealthRoute(decoratedServer);
  registerV1LogstashRoutes(decoratedServer);
  registerV1SetupRoutes(decoratedServer);
  registerV1KibanaRoutes(decoratedServer);
}

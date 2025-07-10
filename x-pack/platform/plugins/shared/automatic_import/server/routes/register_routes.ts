/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { registerEcsRoutes } from './ecs_routes';
import { registerIntegrationBuilderRoutes } from './build_integration_routes';
import { registerCategorizationRoutes } from './categorization_routes';
import { registerRelatedRoutes } from './related_routes';
import { registerPipelineRoutes } from './pipeline_routes';
import type { AutomaticImportRouteHandlerContext } from '../plugin';
import { registerAnalyzeLogsRoutes } from './analyze_logs_routes';
import { registerCelInputRoutes } from './cel_routes';
import { registerApiAnalysisRoutes } from './analyze_api_route';

export function registerRoutes(router: IRouter<AutomaticImportRouteHandlerContext>) {
  registerAnalyzeLogsRoutes(router);
  registerEcsRoutes(router);
  registerIntegrationBuilderRoutes(router);
  registerCategorizationRoutes(router);
  registerRelatedRoutes(router);
  registerPipelineRoutes(router);

  registerApiAnalysisRoutes(router);
  registerCelInputRoutes(router);
}

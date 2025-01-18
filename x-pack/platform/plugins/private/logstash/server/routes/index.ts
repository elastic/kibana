/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogstashPluginRouter } from '../types';
import { registerClusterLoadRoute } from './cluster';
import {
  registerPipelineDeleteRoute,
  registerPipelineLoadRoute,
  registerPipelineSaveRoute,
} from './pipeline';
import { registerPipelinesListRoute, registerPipelinesDeleteRoute } from './pipelines';

export function registerRoutes(router: LogstashPluginRouter) {
  registerClusterLoadRoute(router);

  registerPipelineDeleteRoute(router);
  registerPipelineLoadRoute(router);
  registerPipelineSaveRoute(router);

  registerPipelinesListRoute(router);
  registerPipelinesDeleteRoute(router);
}

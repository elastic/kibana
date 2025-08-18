/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { DefaultRouteHandlerResources } from '@kbn/server-route-repository';
import { registerRoutes } from '@kbn/server-route-repository';
import { getGlobalGenAiSettingsServerRouteRepository } from './get_global_gen_ai_settings_route_repository';
import type { GenAiSettingsRouteHandlerResources } from './types';
import type { GenAiSettingsPluginStartDependencies } from '../types';

export function registerServerRoutes({
  core,
  logger,
  dependencies,
  isDev,
}: {
  core: CoreSetup<GenAiSettingsPluginStartDependencies>;
  logger: Logger;
  dependencies: Omit<GenAiSettingsRouteHandlerResources, keyof DefaultRouteHandlerResources>;
  isDev: boolean;
}) {
  registerRoutes({
    core,
    logger,
    repository: getGlobalGenAiSettingsServerRouteRepository(),
    dependencies,
    runDevModeChecks: isDev,
  });
}

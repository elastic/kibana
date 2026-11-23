/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerGetTemplateRoute } from './get_template';
import { registerGetTemplatesRoute } from './get_templates';
import { registerLibraryHealthRoute } from './health';
import { registerInstallFromYamlRoute } from './install_from_yaml';
import { registerInstallTemplateRoute } from './install_template';
import { registerRemixTemplateRoute } from './remix_template';
import { LibraryService, LibraryTelemetry } from '../../../library';
import type { RouteDependencies } from '../types';

export function registerLibraryRoutes(deps: RouteDependencies) {
  const telemetry = new LibraryTelemetry(deps.analytics, deps.logger);
  const libraryService = new LibraryService({
    config: deps.config,
    logger: deps.logger,
    kibanaVersion: deps.workflowsService.kibanaVersion,
    isServerless: Boolean(deps.workflowsService.plugins.serverless),
    onFailure: telemetry.reportCatalogFailed,
  });

  registerGetTemplatesRoute(deps, libraryService);
  registerGetTemplateRoute(deps, libraryService, telemetry);
  registerInstallTemplateRoute(deps, libraryService, telemetry);
  registerInstallFromYamlRoute(deps, libraryService, telemetry);
  registerRemixTemplateRoute(deps, libraryService);
  registerLibraryHealthRoute(deps, libraryService);
}

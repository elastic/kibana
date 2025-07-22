/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RegisterAPIRoutesArgs } from '../../types';
import { registerLensVisualizationsCreateAPIRoute } from './create';
import { registerLensVisualizationsGetAPIRoute } from './get';
import { registerLensVisualizationsUpdateAPIRoute } from './update';
import { registerLensVisualizationsDeleteAPIRoute } from './delete';
import { registerLensVisualizationsSearchAPIRoute } from './search';

export function registerLensVisualizationsAPIRoutes({ http, ...rest }: RegisterAPIRoutesArgs) {
  const { versioned: versionedRouter } = http.createRouter();

  registerLensVisualizationsCreateAPIRoute(versionedRouter, rest);
  registerLensVisualizationsGetAPIRoute(versionedRouter, rest);
  registerLensVisualizationsUpdateAPIRoute(versionedRouter, rest);
  registerLensVisualizationsDeleteAPIRoute(versionedRouter, rest);
  registerLensVisualizationsSearchAPIRoute(versionedRouter, rest);
}

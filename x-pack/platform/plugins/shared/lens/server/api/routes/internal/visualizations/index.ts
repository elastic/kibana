/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisterAPIRoutesArgs } from '../../../types';
import { registerLensInternalVisualizationsCreateAPIRoute } from './create';
import { registerLensInternalVisualizationsGetAPIRoute } from './get';
import { registerLensInternalVisualizationsUpdateAPIRoute } from './update';
import { registerLensInternalVisualizationsDeleteAPIRoute } from './delete';
import { registerLensInternalVisualizationsSearchAPIRoute } from './search';

export function registerLensInternalVisualizationsAPIRoutes({
  http,
  ...rest
}: RegisterAPIRoutesArgs) {
  const { versioned: versionedRouter } = http.createRouter();

  registerLensInternalVisualizationsCreateAPIRoute(versionedRouter, rest);
  registerLensInternalVisualizationsGetAPIRoute(versionedRouter, rest);
  registerLensInternalVisualizationsUpdateAPIRoute(versionedRouter, rest);
  registerLensInternalVisualizationsDeleteAPIRoute(versionedRouter, rest);
  registerLensInternalVisualizationsSearchAPIRoute(versionedRouter, rest);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { serviceMapDiagnosticsRoute } from './service_map_diagnostics';
import { getDiagnosticsRoute } from './get_diagnostics';

export const diagnosticsRouteDefinitions = {
  serviceMap: serviceMapDiagnosticsRoute,
  getDiagnostics: getDiagnosticsRoute,
};

export type { DiagnosticsResponse } from './get_diagnostics';

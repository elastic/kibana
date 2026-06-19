/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { generateDashboard } from './generate_dashboard';
export type {
  DashboardGenerationResolvers,
  GenerateDashboardParams,
  GenerateDashboardResult,
} from './generate_dashboard';

export { dashboardOperationSchema } from './operations';
export type { DashboardOperation } from './operations';

export { getErrorMessage, hasValidCreateMetadataOperations } from './utils';
export type { PanelFailure } from './utils';

export { createPanelFailureResult } from './resolve_panel';
export type { ResolvePanelContent, PanelContentAttempt } from './resolve_panel';

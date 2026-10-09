/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { dashboardOperationSchema, executeDashboardOperations } from './src/operations';
export type { FinalizeDashboard } from './src/operations';

export { getErrorMessage, hasValidCreateMetadataOperations } from './src/utils';

export { createPanelFailureResult } from './src/resolve_panel';
export type {
  InlinePanelOperationType,
  PanelContent,
  PanelContentAttempt,
} from './src/resolve_panel';

export type { DashboardValidationIssue, ValidateDashboard } from './src/validate_dashboard';

export { getRendererEmbeddableType } from './src/operations/panels';
export type {
  CustomContentPanelAddRequest,
  CustomContentPanelEditRequest,
  CustomContentPanelResolutionRequest,
  ResolvePanelContent,
  VisPanelResolutionRequest,
} from './src/operations/panels';

export type {
  ControlFieldCapability,
  ResolveAttachmentPanel,
  ResolveControlFieldCapabilities,
} from './src/operations/types';

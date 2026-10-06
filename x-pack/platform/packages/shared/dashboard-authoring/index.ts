/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { dashboardOperationSchema, executeDashboardOperations } from './src/operations';

export { getErrorMessage, hasValidCreateMetadataOperations } from './src/utils';
export type { OperationFailure } from './src/utils';

export { createPanelFailureResult } from './src/resolve_panel';
export type {
  InlinePanelOperationType,
  PanelAuthoringNote,
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
export {
  MARKDOWN_EMBEDDABLE_TYPE,
  markdownPanelConfigSchema,
} from './src/operations/panels/markdown';

export type { ResolveAttachmentPanel } from './src/operations/types';
export { createControlFieldCapabilitiesResolver } from './src/control_field_capabilities_resolver';

export {
  executeDashboardUpsert,
  hasValidNewDashboardMetadata,
  upsertDashboardSchema,
} from './src/upsert';
export type { DashboardUpsert } from './src/upsert';

export { buildLayoutPrompt, layoutArrangementSchema } from './src/layout';
export type { ArrangeDashboardLayout, LayoutArrangement, LayoutRequest } from './src/layout';

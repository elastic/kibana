/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  executeDashboardUpsert,
  hasValidNewDashboardMetadata,
  upsertDashboardSchema,
} from './src/upsert';
export type { DashboardUpsert, DashboardUpsertResult } from './src/upsert';

export { arrangeDashboardLayout, buildLayoutPrompt, parseLayoutAnswer } from './src/layout';
export type { ArrangeDashboardLayout, LayoutArrangement, LayoutRequest } from './src/layout';

export { getErrorMessage } from './src/utils';
export type { DashboardFailure } from './src/utils';

export type { PanelContent, PanelContentAttempt } from './src/resolve_panel';

export type { DashboardValidationIssue, DashboardValidator } from './src/validate_dashboard';

export { getRendererEmbeddableType } from './src/panels';
export type {
  CustomContentPanelAddRequest,
  CustomContentPanelEditRequest,
  CustomContentPanelResolutionRequest,
  ResolvePanelContent,
  VisPanelResolutionRequest,
} from './src/panels';

export type {
  ControlFieldCapability,
  ResolveAttachmentPanel,
  ResolveControlFieldCapabilities,
} from './src/types';

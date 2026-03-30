/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { isLensAttributes, dashboardStateToAttachment } from './to_attachment';

export { attachmentToDashboardState, DEFAULT_TIME_RANGE } from './from_attachment';

export {
  toEmbeddablePanel,
  fromEmbeddablePanel,
  type VisualizationContent,
  type DashboardPanelInput,
} from './normalize_panel';

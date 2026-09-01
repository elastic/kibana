/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file groups dashboard attachment features that only need to load after
 * a user opens preview/canvas UI or when the dashboard app integration activates.
 */

export {
  DashboardCanvasAttachment,
  type DashboardCanvasAttachmentProps,
} from './canvas_integration/dashboard_canvas_attachment';
export { createDashboardAppIntegration$ } from './dashboard_integration/dashboard_app_integration';
export { handlePreview } from './handle_preview';
export { previewAttachmentInDashboard } from './dashboard_integration/preview_attachment';
export { handleEditInDashboard } from './handle_edit_in_dashboard';

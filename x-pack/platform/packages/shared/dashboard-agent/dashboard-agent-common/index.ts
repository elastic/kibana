/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANELS_REMOVED_EVENT,
} from './constants';

export {
  panelGridSchema,
  lensAttachmentPanelSchema,
  genericAttachmentPanelSchema,
  attachmentPanelSchema,
  isLensAttachmentPanel,
  isGenericAttachmentPanel,
} from './panel_types';

export { sectionGridSchema, dashboardSectionSchema } from './section_types';
export { dashboardPinnedPanelStateSchema } from './control_types';
export { dashboardAttachmentDataSchema, dashboardAttachmentOriginSchema } from './attachment_types';

export type { LensAttachmentPanel, GenericAttachmentPanel, AttachmentPanel } from './panel_types';

export type { DashboardSection } from './section_types';
export type { DashboardPinnedPanelState } from './control_types';
export type {
  DashboardAttachmentData,
  DashboardAttachmentOrigin,
  DashboardAttachment,
} from './attachment_types';
export type { PanelAddedEventData, PanelsRemovedEventData, DashboardUiEvent } from './event_types';

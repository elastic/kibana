/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_AGENT_ID,
  DASHBOARD_PANEL_ADDED_EVENT,
  DASHBOARD_PANELS_REMOVED_EVENT,
} from './constants';

export {
  lensAttachmentPanelSchema,
  genericAttachmentPanelSchema,
  attachmentPanelSchema,
  dashboardSectionSchema,
  dashboardAttachmentDataSchema,
  isLensAttachmentPanel,
  isGenericAttachmentPanel,
} from './types';

export type {
  LensAttachmentPanel,
  GenericAttachmentPanel,
  AttachmentPanel,
  DashboardSection,
  DashboardAttachmentData,
  PanelAddedEventData,
  PanelsRemovedEventData,
  DashboardUiEvent,
} from './types';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DASHBOARD_ATTACHMENT_TYPE } from './constants';

export {
  panelGridSchema,
  sectionGridSchema,
  attachmentPanelSchema,
  dashboardSectionSchema,
  dashboardAttachmentDataSchema,
  isSection,
} from './types';

export type {
  AttachmentPanel,
  DashboardSection,
  DashboardAttachmentData,
  DashboardAttachment,
} from './types';

export {
  dashboardStateToAttachment,
  attachmentToDashboardState,
  toEmbeddablePanel,
  fromEmbeddablePanel,
  DEFAULT_TIME_RANGE,
  type VisualizationContent,
  type DashboardPanelInput,
} from './converters';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { DASHBOARD_ATTACHMENT_TYPE } from './constants';
import { dashboardPinnedPanelStateSchema } from './control_types';
import { attachmentPanelSchema } from './panel_types';
import { dashboardSectionSchema } from './section_types';

/**
 * Zod schema for dashboard attachment data.
 */
export const dashboardAttachmentDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  /** Optional saved object ID if the dashboard was saved */
  savedObjectId: z.string().optional(),
  /** Array of top-level panel entries */
  panels: z.array(attachmentPanelSchema),
  /** Optional array of sections containing grouped panels */
  sections: z.array(dashboardSectionSchema).optional(),
  /** Optional list of pinned controls rendered above dashboard panels */
  pinnedPanels: z.array(dashboardPinnedPanelStateSchema).optional(),
});

/**
 * Data for a dashboard attachment.
 */
export type DashboardAttachmentData = z.infer<typeof dashboardAttachmentDataSchema>;

/**
 * Zod schema for dashboard attachment origin references.
 */
export const dashboardAttachmentOriginSchema = z.object({
  /** Saved object id for the persisted dashboard */
  savedObjectId: z.string(),
});

/**
 * Origin payload for dashboard attachments.
 */
export type DashboardAttachmentOrigin = z.infer<typeof dashboardAttachmentOriginSchema>;

export type DashboardAttachment = Attachment<
  typeof DASHBOARD_ATTACHMENT_TYPE,
  DashboardAttachmentData
> & {
  origin?: DashboardAttachmentOrigin;
};

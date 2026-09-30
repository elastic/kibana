/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type {
  Attachment,
  AttachmentInput,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_PANEL_ATTACHMENT_TYPE } from './constants';

const MAX_ID_LENGTH = 256;
export const DASHBOARD_PANEL_LABEL_MAX_LENGTH = 512;

/**
 * A dashboard panel attachment is a thin pointer: it names a panel on a dashboard attachment
 * in the same conversation and never carries the panel configuration itself.
 */
export const dashboardPanelAttachmentDataSchema = z.object({
  dashboard_attachment_id: z.string().min(1).max(MAX_ID_LENGTH),
  panel_id: z.string().min(1).max(MAX_ID_LENGTH),
  label: z.string().max(DASHBOARD_PANEL_LABEL_MAX_LENGTH),
  panel_type: z.string().min(1).max(MAX_ID_LENGTH),
});

export type DashboardPanelAttachmentData = z.infer<typeof dashboardPanelAttachmentDataSchema>;

export type DashboardPanelAttachment = Attachment<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
>;

export type PendingDashboardPanelAttachment = AttachmentInput<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
>;

/**
 * Deterministic attachment id for a panel pointer, so re-sending the same panel replaces the
 * previous pointer instead of adding a duplicate, and tools can find it without a lookup.
 */
export const getDashboardPanelAttachmentId = (panelId: string): string =>
  `${DASHBOARD_PANEL_ATTACHMENT_TYPE}-${panelId}`;

export const isDashboardPanelAttachment = (
  attachment: VersionedAttachment
): attachment is VersionedAttachment<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
> => attachment.type === DASHBOARD_PANEL_ATTACHMENT_TYPE;

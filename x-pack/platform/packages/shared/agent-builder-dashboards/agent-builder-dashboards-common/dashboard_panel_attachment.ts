/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import murmurhash from 'murmurhash';
import { z, lazySchema } from '@kbn/zod/v4';
import type {
  Attachment,
  AttachmentInput,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_PANEL_ATTACHMENT_TYPE } from './constants';
import { timeRangeSchema } from './dashboard_schema_types';

const MAX_ID_LENGTH = 256;
export const DASHBOARD_PANEL_LABEL_MAX_LENGTH = 512;

/** Points at one panel of a dashboard attachment; never carries the panel config. */
export const dashboardPanelAttachmentDataSchema = lazySchema(() =>
  z.object({
    dashboard_attachment_id: z.string().min(1).max(MAX_ID_LENGTH),
    panel_id: z.string().min(1).max(MAX_ID_LENGTH),
    label: z.string().max(DASHBOARD_PANEL_LABEL_MAX_LENGTH),
    panel_type: z.string().min(1).max(MAX_ID_LENGTH),
    /** Whether the agent can edit the panel; it can read, move and copy any panel. */
    editable: z.boolean(),
    /** Set when the user can't write dashboards: the agent only answers questions about the panel. */
    read_only: z.boolean().optional(),
    /**
     * The time range the dashboard showed the panel in. The dashboard attachment has a time range
     * only when the dashboard stores one, so the panel's data is read in this one.
     */
    time_range: timeRangeSchema.optional(),
    /**
     * New on every send, so re-sending an unchanged pointer is a new version that the message
     * references, rather than content the conversation already has.
     */
    request_id: z.string().min(1).max(MAX_ID_LENGTH).optional(),
  })
);

export type DashboardPanelAttachmentData = z.infer<typeof dashboardPanelAttachmentDataSchema>;

export type DashboardPanelAttachment = Attachment<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
>;

export type PendingDashboardPanelAttachment = AttachmentInput<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
>;

const hashIds = (ids: readonly string[]): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(ids));
  return [1, 2].map((seed) => murmurhash.v3(bytes, seed).toString(36)).join('');
};

/**
 * Deterministic, so re-sending a panel replaces its staged pointer or versions the sent one. Includes the dashboard attachment id
 * because dashboard copies share panel ids. Hashed, so neither id can run into the other and the id stays short enough to copy the panel by.
 */
export const getDashboardPanelAttachmentId = ({
  dashboardAttachmentId,
  panelId,
}: {
  dashboardAttachmentId: string;
  panelId: string;
}): string => `${DASHBOARD_PANEL_ATTACHMENT_TYPE}-${hashIds([dashboardAttachmentId, panelId])}`;

export const isDashboardPanelAttachment = (
  attachment: VersionedAttachment
): attachment is VersionedAttachment<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
> => attachment.type === DASHBOARD_PANEL_ATTACHMENT_TYPE;

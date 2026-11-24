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

const MAX_ID_LENGTH = 256;
/** The bound `generate_dashboard` puts on the `attachment_id` of panel content. */
const MAX_POINTER_ID_LENGTH = 256;
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
 * because dashboard copies share panel ids. Ids too long to copy the panel by are hashed.
 */
export const getDashboardPanelAttachmentId = ({
  dashboardAttachmentId,
  panelId,
}: {
  dashboardAttachmentId: string;
  panelId: string;
}): string => {
  const id = `${DASHBOARD_PANEL_ATTACHMENT_TYPE}-${dashboardAttachmentId}-${panelId}`;
  return id.length <= MAX_POINTER_ID_LENGTH
    ? id
    : `${DASHBOARD_PANEL_ATTACHMENT_TYPE}-${hashIds([dashboardAttachmentId, panelId])}`;
};

export const isDashboardPanelAttachment = (
  attachment: VersionedAttachment
): attachment is VersionedAttachment<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
> => attachment.type === DASHBOARD_PANEL_ATTACHMENT_TYPE;

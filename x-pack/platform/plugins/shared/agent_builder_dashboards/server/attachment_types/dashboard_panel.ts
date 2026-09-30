/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  dashboardPanelAttachmentDataSchema,
  type DashboardPanelAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { dashboardTools } from '../../common';

/**
 * Creates the definition for the dashboard panel pointer attachment type.
 *
 * The attachment only names a panel on a dashboard attachment; `format` cannot read other
 * attachments, so the text tells the agent where the panel configuration lives and how to edit it.
 */
export const createDashboardPanelAttachmentType = (): AttachmentTypeDefinition<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachmentData
> => ({
  id: DASHBOARD_PANEL_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parseResult = dashboardPanelAttachmentDataSchema.safeParse(input);
    return parseResult.success
      ? { valid: true, data: parseResult.data }
      : { valid: false, error: parseResult.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => ({
      type: 'text',
      value: formatDashboardPanelAttachment(attachment.data),
    }),
  }),
  getAgentDescription: () =>
    `A dashboard panel attachment is a pointer to one item on a dashboard attachment in this conversation (a panel, control, or section); it means the user is referring to that item. It carries no configuration: read the panel from the dashboard attachment it names. To change the panel, load the dashboard-management skill and call \`${dashboardTools.generateDashboard}\` with that dashboard attachment id as \`dashboardAttachmentId\` and an \`edit_panels\` operation targeting the panel id. This attachment's id is a valid \`source: "attachment"\` panel input wherever one is accepted; the tool copies the panel verbatim, so use it for any copy of the panel (duplicate, add to a section, add to another dashboard). Never create a new visualization attachment to refine a panel that already exists on the dashboard. After editing, render only the dashboard attachment.`,
  getTools: () => [],
});

const formatDashboardPanelAttachment = ({
  dashboard_attachment_id: dashboardAttachmentId,
  panel_id: panelId,
  label,
  panel_type: panelType,
}: DashboardPanelAttachmentData): string =>
  `The user is referring to the panel ${
    label ? `"${label}" ` : ''
  }(panelId: "${panelId}", type: ${panelType}) on the dashboard attachment "${dashboardAttachmentId}".
Read the panel's current configuration from that dashboard attachment; this pointer holds none.
Edit it with \`${
    dashboardTools.generateDashboard
  }\` using \`dashboardAttachmentId: "${dashboardAttachmentId}"\` and an \`edit_panels\` operation with \`panelId: "${panelId}"\`.
To copy it anywhere (duplicate, section, another dashboard), pass this attachment's id as a \`source: "attachment"\` panel input; the tool copies the panel verbatim.
If the panel no longer exists on that dashboard, tell the user instead of recreating it.`;

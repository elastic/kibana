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
  getDashboardPanelAttachmentId,
  type DashboardPanelAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
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
    `A dashboard panel attachment is a pointer to one item on a dashboard attachment in this conversation (a panel, control, or section); it means the user is referring to that item. Treat requests made while it is attached as requests about that panel: create, generate, fill or change the panel through the dashboard tool instead of answering with the content in chat. It carries no configuration: read the panel from the dashboard attachment it names. To change the panel, load the dashboard-management skill and call \`${dashboardTools.generateDashboard}\` with that dashboard attachment id as \`dashboardAttachmentId\` and an \`edit_panels\` operation targeting the panel id. This attachment's id is a valid \`source: "attachment"\` panel input wherever one is accepted; the tool copies the panel verbatim, so use it for any copy of the panel (duplicate, add to a section, add to another dashboard). Never create a new visualization attachment to refine a panel that already exists on the dashboard. After editing, render only the dashboard attachment. To show the panel itself inline in the chat (the user asks to see, paint or preview it here, or wants it as a visualization), call \`${dashboardTools.panelToVisualization}\` with the pointer's attachment id and render the visualization attachment it returns; never regenerate the panel with the visualization creation tool.`,
  getTools: () => [dashboardTools.panelToVisualization],
});

const customContentHint = `This is a custom panel: an HTML template, optionally driven by an ES|QL query, generated server-side. To fill or change it, use \`edit_panels\` with \`source: "config"\`, \`type: "${CUSTOM_CONTENT_EMBEDDABLE_TYPE}"\` and \`config: { prompt: <what the panel should show>, esqlQuery?: <ES|QL> }\`; never write the template yourself and never paste the content into the chat instead.
`;

const formatDashboardPanelAttachment = ({
  dashboard_attachment_id: dashboardAttachmentId,
  panel_id: panelId,
  label,
  panel_type: panelType,
}: DashboardPanelAttachmentData): string =>
  `The user is referring to the panel ${
    label ? `"${label}" ` : ''
  }(panelId: "${panelId}", type: ${panelType}) on the dashboard attachment "${dashboardAttachmentId}".
Whatever the user asks for while this is attached is about this panel: apply it to the panel through \`${
    dashboardTools.generateDashboard
  }\` (load the dashboard-management skill first); do not answer with the content in chat or create a standalone visualization.
Read the panel's current configuration from that dashboard attachment; this pointer holds none.
Edit it with \`${
    dashboardTools.generateDashboard
  }\` using \`dashboardAttachmentId: "${dashboardAttachmentId}"\` and an \`edit_panels\` operation with \`panelId: "${panelId}"\`.
${
  panelType === CUSTOM_CONTENT_EMBEDDABLE_TYPE ? customContentHint : ''
}To copy it anywhere (duplicate, section, another dashboard), pass this attachment's id as a \`source: "attachment"\` panel input; the tool copies the panel verbatim.
To show the panel inline in the chat, call \`${
    dashboardTools.panelToVisualization
  }\` with \`panel_attachment_id: "${getDashboardPanelAttachmentId(
    panelId
  )}"\` and render the visualization attachment it returns.
If the panel no longer exists on that dashboard, tell the user instead of recreating it.`;

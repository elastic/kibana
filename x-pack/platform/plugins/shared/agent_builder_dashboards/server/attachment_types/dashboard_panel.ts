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
 * attachments, so the text tells the agent how to edit the panel and how to read just that panel.
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
    `A dashboard panel attachment is a pointer to one panel on a dashboard attachment in this conversation; it means the user is referring to that panel. Treat requests made while it is attached as requests about that panel: create, generate, fill or change the panel through the dashboard tool instead of answering with the content in chat. It carries no configuration, and you do not need to read the dashboard attachment to work with the panel. To change the panel, load the dashboards skill and call \`${dashboardTools.generateDashboard}\` with that dashboard attachment id as \`dashboardAttachmentId\` and a \`panels\` entry with the panel's id and \`content: { source: "request", query: <the change> }\`; the tool loads the panel's current config itself. To inspect the panel (what it shows, its config or ES|QL query), call \`${dashboardTools.pointedPanel}\` with the pointer's attachment id and \`action: "read"\`. This attachment's id is a valid \`source: "attachment"\` panel input wherever one is accepted; the tool copies the panel verbatim, so use it for any copy of the panel (duplicate, add to a section, add to another dashboard). Never create a new visualization attachment to refine a panel that already exists on the dashboard. After editing, render only the dashboard attachment. To show the panel itself inline in the chat (the user asks to see, paint or preview it here, or wants it as a visualization), call \`${dashboardTools.pointedPanel}\` with the pointer's attachment id and \`action: "show"\`, and render the visualization attachment it returns; never regenerate the panel with the visualization creation tool.`,
  getTools: () => [dashboardTools.pointedPanel],
});

const customContentHint = `This is a custom panel: an HTML template, optionally driven by an ES|QL query, generated server-side. To fill or change it, set the panel's \`content\` to \`{ source: "request", renderer: "${CUSTOM_CONTENT_EMBEDDABLE_TYPE}", query: <what the panel should show>, esql?: <ES|QL> }\`; never write the template yourself and never paste the content into the chat instead.
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
  }\` (load the dashboards skill first); do not answer with the content in chat or author a new visualization for it (to only show it inline, see below).
Edit it with \`${
    dashboardTools.generateDashboard
  }\` using \`dashboardAttachmentId: "${dashboardAttachmentId}"\` and \`panels: [{ id: "${panelId}", content: { source: "request", query: <the change> } }]\`; the tool loads the panel's current config, so do not read the dashboard attachment first.
To inspect the panel (what it shows, its config or ES|QL query), call \`${
    dashboardTools.pointedPanel
  }\` with \`panel_attachment_id: "${getDashboardPanelAttachmentId(
    panelId
  )}"\` and \`action: "read"\`.
${
  panelType === CUSTOM_CONTENT_EMBEDDABLE_TYPE ? customContentHint : ''
}To copy it anywhere (duplicate, section, another dashboard), add a panel with a new id and \`content: { source: "attachment", attachment_id: "${getDashboardPanelAttachmentId(
    panelId
  )}" }\`; the tool copies the panel verbatim.
To show the panel inline in the chat, call \`${
    dashboardTools.pointedPanel
  }\` with \`panel_attachment_id: "${getDashboardPanelAttachmentId(
    panelId
  )}"\` and \`action: "show"\`, and render the visualization attachment it returns.
If the panel no longer exists on that dashboard, tell the user instead of recreating it.`;

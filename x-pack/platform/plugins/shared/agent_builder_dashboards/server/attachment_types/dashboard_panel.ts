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
  type DashboardPanelAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { getRequestPanelContentType } from '@kbn/dashboard-agent-authoring';
import { dashboardTools } from '../../common';

/**
 * Creates the definition for the dashboard panel pointer attachment type.
 *
 * The agent sees a pointer only by its id and type, so the agent description holds every rule;
 * a pointer's own text, returned only when the agent reads it, just names its panel.
 */
export const createDashboardPanelAttachmentType = (): AttachmentTypeDefinition<
  typeof DASHBOARD_PANEL_ATTACHMENT_TYPE,
  DashboardPanelAttachment['data']
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
      value: formatDashboardPanelAttachment(attachment),
    }),
  }),
  getAgentDescription: () =>
    `A dashboard panel attachment points at one panel of a dashboard attachment in this conversation: the user is referring to that panel in the message it is attached to. It carries no configuration. Pass its attachment id as \`panel_attachment_id\` to \`${dashboardTools.pointedPanel}\`: \`action: "read"\` returns the panel's \`dashboard_attachment_id\`, id, type and config.
- The message a pointer is attached to is about that panel, even when it does not mention it. A message with several pointers is about all of their panels. Tell from the message what the user wants:
  - A question about the panel or its data (what it shows, why a value looks the way it does, an error): read the panel, then answer in chat with whichever skill fits the question. Do not change the dashboard.
  - A change to the panel: load the dashboards skill and edit the panel in place through \`${dashboardTools.generateDashboard}\`, with \`dashboardId\` set to its \`dashboard_attachment_id\` and a panel request carrying its panel id and \`query: <the change>\`. Never create a new visualization attachment or add a new panel to refine a panel that already exists. After editing, render only the dashboard attachment.
- A pointer from an earlier message does not make later messages about its panel: handle a later message on its own, unless it mentions the panel or continues the same change.
- To show the panel itself inline in the chat, use \`${dashboardTools.pointedPanel}\` with \`action: "show"\`; never regenerate it with the visualization creation tool.
- If the panel no longer exists, tell the user instead of recreating it.`,
  getTools: () => [dashboardTools.pointedPanel],
});

const getEditContentType = (panelType: string): string => {
  const contentType = getRequestPanelContentType(panelType);
  return contentType ? `"${contentType}"` : "<the panel's kind>";
};

const formatDashboardPanelAttachment = ({
  data: {
    dashboard_attachment_id: dashboardAttachmentId,
    panel_id: panelId,
    label,
    panel_type: panelType,
  },
}: DashboardPanelAttachment): string =>
  `Points at the panel ${
    label ? `"${label}" ` : ''
  }(panelId: "${panelId}", type: ${panelType}) on the dashboard attachment "${dashboardAttachmentId}". To edit it, call \`${
    dashboardTools.generateDashboard
  }\` with \`dashboardId: "${dashboardAttachmentId}"\` and \`panels: [{ id: "${panelId}", content: { type: ${getEditContentType(
    panelType
  )}, query: <the change> } }]\`.`;

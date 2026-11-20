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
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { getRequestPanelContentType } from '@kbn/dashboard-agent-authoring';
import { dashboardTools } from '../../common';

/**
 * Creates the definition for the dashboard panel pointer attachment type.
 *
 * The attachment only names a panel on a dashboard attachment; `format` cannot read other
 * attachments. The agent description holds the rules for every pointer, and each pointer's text
 * spells out the calls for its own panel.
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
    `A dashboard panel attachment points at one panel of a dashboard attachment in this conversation: the user is referring to that panel in the message it is attached to. It carries no configuration; its text gives the exact calls for its panel.
- The request of the message a pointer is attached to is about that panel, even when it does not mention it: apply it to the panel through \`${dashboardTools.generateDashboard}\` (load the dashboards skill first) instead of answering with the content in chat. A message with several pointers is about all of their panels.
- A pointer from an earlier message does not make later messages about its panel: handle a later message on its own, unless it mentions the panel or continues the same change.
- Edit the panel in place by its panel id. Never create a new visualization attachment or add a new panel to refine a panel that already exists. After editing, render only the dashboard attachment.
- To show the panel itself inline in the chat, use \`${dashboardTools.pointedPanel}\` with \`action: "show"\`; never regenerate it with the visualization creation tool.
- If the panel no longer exists, tell the user instead of recreating it.`,
  getTools: () => [dashboardTools.pointedPanel],
});

const customContentHint = `This is a custom panel: an HTML template, optionally driven by one or more ES|QL queries, generated server-side. To fill or change it, set \`query\` to what the panel should show, and follow the dashboards skill's custom content guidance when the edit needs different data; never write the template yourself and never paste the content into the chat instead.`;

const getEditContentType = (panelType: string): string => {
  const contentType = getRequestPanelContentType(panelType);
  return contentType ? `"${contentType}"` : "<the panel's kind>";
};

const formatDashboardPanelAttachment = ({
  id: pointerId,
  data: {
    dashboard_attachment_id: dashboardAttachmentId,
    panel_id: panelId,
    label,
    panel_type: panelType,
  },
}: DashboardPanelAttachment): string =>
  [
    `The user is referring to the panel ${
      label ? `"${label}" ` : ''
    }(panelId: "${panelId}", type: ${panelType}) on the dashboard attachment "${dashboardAttachmentId}" in the message this is attached to. That message's request is about this panel: apply it to the panel; do not answer with the content in chat. Later messages are about this panel only when they mention it or continue the same change.`,
    `- Edit: call \`${
      dashboardTools.generateDashboard
    }\` with \`dashboardId: "${dashboardAttachmentId}"\` and \`panels: [{ id: "${panelId}", content: { type: ${getEditContentType(
      panelType
    )}, query: <the change> } }]\`. The tool loads the panel's current config, so do not read the dashboard attachment first.`,
    `- Inspect (what it shows, its config or ES|QL query): call \`${dashboardTools.pointedPanel}\` with \`panel_attachment_id: "${pointerId}"\` and \`action: "read"\`.`,
    `- Show it inline in the chat: call \`${dashboardTools.pointedPanel}\` with \`panel_attachment_id: "${pointerId}"\` and \`action: "show"\`, and render the visualization attachment it returns.`,
    `- Copy it (duplicate, section, another dashboard): add a panel with a new id and \`content: { type: "attachment", attachment_id: "${pointerId}" }\`; the tool copies the panel verbatim.`,
    ...(panelType === CUSTOM_CONTENT_EMBEDDABLE_TYPE ? [customContentHint] : []),
  ].join('\n');

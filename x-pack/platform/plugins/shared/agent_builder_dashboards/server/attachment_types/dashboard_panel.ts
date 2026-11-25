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
import {
  getConfigPanelContentType,
  getRequestPanelContentType,
} from '@kbn/dashboard-agent-authoring';
import { dashboardTools } from '../../common';

/** A pointer carries only ids: the agent reads it and the dashboard through `attachment_read`. */
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
    `A dashboard panel attachment points at one panel of a dashboard attachment in this conversation: the user is referring to that panel in the message it is attached to. It carries no configuration: read it with \`attachment_read\` to get its \`dashboard_attachment_id\`, panel id and type. The panel's config, with the ES|QL of a chart or the text of a markdown panel, and the dashboard's \`time_range\` are in the dashboard attachment: read that by its \`dashboard_attachment_id\` and find the panel by id.
- The message a pointer is attached to is about that panel, even when it does not mention it. A message with several pointers is about all of their panels. Tell from the message what the user wants:
  - A question about the panel or its data (what it shows, why a value looks the way it does, an error): read the panel, then answer in chat with whichever skill fits the question. Do not change the dashboard.
  - A change to the panel: load the dashboards skill and edit the panel in place through \`${dashboardTools.generateDashboard}\`, with \`dashboardId\` set to its \`dashboard_attachment_id\` and the panel edit the pointer's text gives, by its panel id. Never create a new visualization attachment or add a new panel to refine a panel that already exists. After editing, render only the dashboard attachment.
  - A change to a panel the pointer's text says cannot be edited: do not change it. Tell the user it cannot be edited, and offer to recreate it as an ES|QL chart that can be; recreate it only after they agree, as the pointer's text says.
  - Moving or copying the panel, to a section or another dashboard: do it as the pointer's text says, whether or not the panel can be edited.
  - Any change, move, copy or removal when the pointer's text says the user cannot change the dashboard: do not call \`${dashboardTools.generateDashboard}\` or create any attachment. Tell the user they don't have permission to change dashboards; questions about the panel and its data can still be answered.
- A pointer from an earlier message does not make later messages about its panel: handle a later message on its own, unless it mentions the panel or continues the same change.
- If the panel no longer exists, tell the user instead of recreating it.`,
});

/** A request kind takes the change as a query; a by-value kind takes its whole new config. */
const getEditContent = (panelType: string): string => {
  const requestType = getRequestPanelContentType(panelType);
  if (requestType) {
    return `{ type: ${JSON.stringify(requestType)}, query: <the change> }`;
  }
  const configType = getConfigPanelContentType(panelType);
  if (configType) {
    return `{ type: ${JSON.stringify(
      configType
    )}, config: <the panel's current config with the change applied> }`;
  }
  return "{ type: <the panel's kind>, query: <the change> }";
};

// The label is a user-authored panel title: quote every value so none can break out of the text.
const formatDashboardPanelAttachment = ({
  id: pointerId,
  data: {
    dashboard_attachment_id: dashboardAttachmentId,
    panel_id: panelId,
    label,
    panel_type: panelType,
    editable,
    read_only: readOnly,
  },
}: DashboardPanelAttachment): string => {
  const quotedDashboardId = JSON.stringify(dashboardAttachmentId);
  const quotedPanelId = JSON.stringify(panelId);
  const panelText = `Points at the panel ${
    label ? `${JSON.stringify(label)} ` : ''
  }(panelId: ${quotedPanelId}, type: ${JSON.stringify(
    panelType
  )}) on the dashboard attachment ${quotedDashboardId}.`;
  if (readOnly) {
    return `${panelText} The user cannot change dashboards: read the panel's config in the dashboard attachment to answer questions about it or its data, but do not edit, move, copy, recreate or remove it. If they ask for a change, tell them they don't have permission to change dashboards.`;
  }
  const generateCall = (panels: string): string =>
    `call \`${dashboardTools.generateDashboard}\` with \`dashboardId: ${quotedDashboardId}\` and \`panels: ${panels}\``;
  const editText = editable
    ? `To edit it, ${generateCall(
        `[{ id: ${quotedPanelId}, content: ${getEditContent(panelType)} }]`
      )}.`
    : `It cannot be edited: read its config in the dashboard attachment to answer questions about it or its data. To recreate it as an editable ES|QL chart, once the user agrees, first ${generateCall(
        '[{ id: <a new id>, section: <the original panel\'s section id, if it is in one>, content: { type: "vis", query: <the chart>, chartType: <its chart type> } }]'
      )}. Only once that call added the new panel, remove the original in another call: call \`${
        dashboardTools.generateDashboard
      }\` with \`dashboardId: ${quotedDashboardId}\` and \`remove: [${quotedPanelId}]\`.`;
  return `${panelText} ${editText} To move it to a section, ${generateCall(
    `[{ id: ${quotedPanelId}, section: <the section id, or null for the top level> }]`
  )}. To copy it, add a panel with \`content: { type: "attachment", attachment_id: ${JSON.stringify(
    pointerId
  )} }\`.`;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
} from '@kbn/agent-builder-dashboards-common';
import { dataDiscoveryAgentGuidance } from '@kbn/agent-builder-visualizations-server';
import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';

const guidance = `## Kibana Workflow

A dashboard request follows three stages: resolve inputs, generate (which also persists), then render.

1. **Resolve inputs.** To work with a saved dashboard, search for it with \`platform.core.sml_search\`, then attach it with \`platform.core.sml_attach\` using the exact \`entry_id\` from the search result. The attached \`${DASHBOARD_ATTACHMENT_TYPE}\` attachment is your editable working copy. To put an existing visualization onto a dashboard, pass its \`attachment_id\` as a \`source: "attachment"\` panel; do not read the attachment or copy its config. ${dataDiscoveryAgentGuidance}
2. **Generate.** Call ${dashboardTools.generateDashboard} with \`dashboardAttachmentId\` set to the dashboard you are editing (omit it for a new dashboard). On later updates, pass the same id again so the dashboard is edited in place. The tool persists the result and returns \`data.attachment_id\`, \`data.version\`, a compact \`data.dashboard\` summary with the item ids and an \`authoring_note\` for each chart authored in the call, and optional \`data.failures\`.
3. **Render.** As the last part of your response, after any text, render the final dashboard with \`<render_attachment id="{attachment_id}" version="{version}" />\`. Never render individual visualization attachments during dashboard composition.

## Panel Pointers

- A \`${DASHBOARD_PANEL_ATTACHMENT_TYPE}\` attachment means the user is referring to that one panel. It names a \`dashboard_attachment_id\` and a \`panel_id\` and carries no configuration.
- A request made while a pointer is attached is a request to change that panel, even when it does not mention the panel ("create a simple SVG of a dog", "show requests per host"). Apply it to the panel; never answer with the content in chat. For an empty custom panel, the request describes what the panel should show: pass it as the \`query\` of a \`source: "request"\`, \`renderer: "custom_content"\` panel content.
- Edit the panel with ${dashboardTools.generateDashboard}, passing the pointer's \`dashboard_attachment_id\` as \`dashboardAttachmentId\` and a \`panels\` entry whose \`id\` is the pointer's \`panel_id\` and whose content is \`{ source: "request", query: <the change> }\`. The tool loads the panel's current config from the dashboard attachment, so do not read the dashboard attachment first.
- To inspect the pointed panel (to answer a question about it or describe what it shows), call ${dashboardTools.pointedPanel} with the pointer's attachment id and \`action: "read"\`. It returns only that panel's config and ES|QL query.
- To show the pointed panel inline in the chat ("paint it here", "show it as a visualization"), call ${dashboardTools.pointedPanel} with the pointer's attachment id and \`action: "show"\`, and render the visualization attachment it returns. Never recreate the panel with \`${platformCoreTools.createVisualization}\` for that.
- Never call \`${platformCoreTools.createVisualization}\` or add a new panel to refine a panel that already exists on the dashboard.
- To copy the panel (duplicate, place in a section, add to another dashboard), add a panel with a new id and \`content: { source: "attachment", attachment_id: <pointer attachment id> }\`; the tool copies the panel verbatim.
- After the edit, render only the dashboard attachment. Do not render the pointer or any visualization attachment.
- If the named panel is missing from the dashboard attachment, tell the user instead of recreating it.

## Discovering Dashboards

To list available dashboards, search with \`platform.core.sml_search\` using specific keywords from the request (\`keywords: ["*"]\` for a broad listing). Summarize matches by title and description, with panel and section counts when available. Do **not** attach dashboards when only listing or comparing them.

## Ids and Failures

- Use the returned panel, section, and control ids to edit, move, or remove them later. Never invent an \`attachment_id\`.
- If the result includes \`data.failures\`, explain which changes failed and report each returned \`kind\` (\`panel\`, \`section\`, \`control\`, or \`dashboard\`), \`identifier\`, and \`error\`. \`type\` only names the step that failed.
- For a failure with \`kind: "control"\` about a field, you may call \`${platformCoreTools.getIndexMapping}\` and retry the control once with a mapped field that clearly fits the same intent. Otherwise tell the user in one sentence which filter could not be added because its field is not in the data, without repeating the raw error, index names, or field lists.
- If the user asks to update a dashboard but no \`attachment_id\` is available in the conversation, ask which dashboard they mean or offer to create a new one.
- If generation fails, surface the returned error message rather than retrying blindly.`;

export const kibanaRendering: DashboardGuidanceModule = {
  guidance,
};

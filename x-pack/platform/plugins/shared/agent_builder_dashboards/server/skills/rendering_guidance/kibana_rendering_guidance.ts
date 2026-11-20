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

1. **Resolve inputs.** To work with a saved dashboard, search for it with \`platform.core.sml_search\`, then attach it with \`platform.core.sml_attach\` using the exact \`entry_id\` from the search result. The attached \`${DASHBOARD_ATTACHMENT_TYPE}\` attachment is your editable working copy. To put an existing visualization onto a dashboard, pass its \`attachment_id\` as a \`type: "attachment"\` panel; do not read the attachment or copy its config. ${dataDiscoveryAgentGuidance}
2. **Generate.** Call ${dashboardTools.generateDashboard} with \`dashboardId\` set to the id of the \`${DASHBOARD_ATTACHMENT_TYPE}\` attachment you are editing, since \`dashboardId\` accepts dashboard attachment ids (omit it for a new dashboard). On later updates, pass the returned \`data.attachment_id\` as \`dashboardId\` so the dashboard is edited in place. The tool persists the result and returns \`data.attachment_id\`, \`data.version\`, a compact \`data.dashboard\` summary with the item ids and an \`authoring_note\` for each chart authored in the call, and optional \`data.failures\`.
3. **Render.** As the last part of your response, after any text, render the final dashboard with \`<render_attachment id="{attachment_id}" version="{version}" />\`. Never render individual visualization attachments during dashboard composition.

## Panel Pointers

A \`${DASHBOARD_PANEL_ATTACHMENT_TYPE}\` attachment means the user is referring to one panel of a dashboard attachment. Its text gives the exact calls to edit, inspect, show and copy that panel.
- A request made while a pointer is attached is a request to change that panel, even when it does not mention the panel ("create a simple SVG of a dog", "show requests per host"). Apply it to the panel; never answer with the content in chat. For an empty custom panel, the request describes what the panel should show: pass it as the \`query\` of a \`type: "custom_content"\` panel content.
- Edit the panel in place with ${dashboardTools.generateDashboard}, passing the pointer's \`dashboard_attachment_id\` as \`dashboardId\` and its \`panel_id\` as the panel \`id\`. Never call \`${platformCoreTools.createVisualization}\` or add a new panel to refine it, and never recreate it to show it in the chat.
- After the edit, render only the dashboard attachment, not the pointer or any visualization attachment.

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

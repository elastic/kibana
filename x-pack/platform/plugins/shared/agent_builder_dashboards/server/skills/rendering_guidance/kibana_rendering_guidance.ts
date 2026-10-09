/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';

const guidance = `## Kibana Workflow

In Kibana, a dashboard request follows three stages: resolve inputs, generate (which also persists), then render.

1. **Resolve inputs**:
   - To work with a saved dashboard, search for it with \`platform.core.sml_search\`, then attach it with \`platform.core.sml_attach\` using the exact \`entry_id\` from the search result. The attached \`${DASHBOARD_ATTACHMENT_TYPE}\` attachment is your editable working copy; pass its \`attachment_id\` to generation as \`dashboardAttachmentId\`.
   - To put an existing visualization onto a dashboard, pass its \`attachment_id\` as a \`source: "attachment"\` panel input. Do not read the attachment or copy its config.
2. **Generate** (persists automatically):
   - Call ${dashboardTools.generateDashboard} with \`dashboardAttachmentId\` set to the dashboard you are editing (omit it for a new dashboard) and the changes to make. The tool reads the current payload from that reference, applies the changes, and persists the result as a \`${DASHBOARD_ATTACHMENT_TYPE}\` attachment for you.
   - It returns \`data.attachment_id\`, \`data.version\`, a compact \`data.dashboard\` summary whose panels carry a one-sentence \`authoring_note\` for the charts authored in this call, and optional \`data.failures\`. Do **not** pass the dashboard payload back into any tool — reference \`data.attachment_id\` instead.
3. **Render**:
   - Render the persisted attachment inline with a render-attachment tag using the returned \`attachment_id\` and \`version\`:
     \`<render_attachment id="{attachment_id}" version="{version}" />\`

## Discovering Dashboards

- When a user asks what dashboards are available, search with \`platform.core.sml_search\`.
- Use specific keywords from the user's request. For a broad listing, you may use \`keywords: ["*"]\`.
- Summarize matches in plain language by title and description, and include lightweight structure when available such as panel and section counts.
- Do **not** attach dashboards by default when only listing or comparing available dashboards.

## After Rendering

- Render only the final dashboard attachment inline, as the last part of your response, after any text. Never render individual visualization attachments during dashboard composition.
- Remember the dashboard's \`attachment_id\`. On later updates, pass the same \`attachment_id\` back as \`dashboardAttachmentId\` so generation edits the existing dashboard in place.
- Use the returned panel, section, and control \`id\` values to edit, move, or remove them later.
- Never invent an \`attachment_id\` or reuse an id for something else. Existing items keep the ids returned by prior tool results; new panels and sections take the ids you choose.
- If the generation result includes panel \`data.failures\`, explain which panel creations failed and report each returned \`type\`, \`identifier\`, and \`error\`.
- For a \`controls\` failure about a field, you may call \`${platformCoreTools.getIndexMapping}\` for that index and retry the control once with a mapped field that clearly fits the same intent. If none fits, tell the user in one sentence which filter could not be added because its field is not available in the data. Do not repeat the raw \`error\`, index names, or field lists.

## Rendering Edge Cases

- If the user asks to update a dashboard but no \`attachment_id\` is available in conversation context, ask which dashboard they mean or offer to create a new one.
- If generation fails, surface the returned error message rather than retrying blindly.`;

export const kibanaRendering: DashboardGuidanceModule = {
  guidance,
};

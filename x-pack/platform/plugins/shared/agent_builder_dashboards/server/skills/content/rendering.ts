/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools } from '@kbn/agent-builder-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { dashboardTools } from '../../../common';

export const rendering = `## Kibana workflow

A dashboard request has three stages. Resolve inputs, generate (which persists), then render.

1. Resolve inputs
   - To work with a saved dashboard, search with \`platform.core.sml_search\`, then attach with \`platform.core.sml_attach\` using the exact \`entry_id\` from the search result. The attached \`${DASHBOARD_ATTACHMENT_TYPE}\` attachment is the editable working copy. Pass its \`attachment_id\` as \`dashboardAttachmentId\`.
   - To put an existing visualization onto a dashboard, read that visualization attachment with \`${attachmentTools.read}\` and pass its configuration as a \`source: "config"\` panel (\`type: "vis"\`). Do not \`attachment_read\` a dashboard to prettify it.
2. Generate
   - Call ${dashboardTools.generateDashboard} with \`dashboardAttachmentId\` set to the dashboard you are editing (omit it for a new dashboard) and your batched \`operations\`. The tool reads the current payload, applies the operations, and persists a \`${DASHBOARD_ATTACHMENT_TYPE}\` attachment.
   - It returns \`data.attachment_id\`, \`data.version\`, a compact \`data.dashboard\` summary, and optional \`data.failures\`. Panels may include \`title\`, \`chart_type\`, \`source\`, \`rows\`, and a one-sentence \`authoring_note\`. Do not pass the dashboard payload back into any tool. Reference \`data.attachment_id\`.
3. Render
   - Render the persisted attachment inline as the last part of your response:
     \`<render_attachment id="{attachment_id}" version="{version}" />\`

## Discovering dashboards

- When a user asks what dashboards are available, search with \`platform.core.sml_search\`.
- Use keywords from the request. For a broad listing, \`keywords: ["*"]\` is allowed.
- Summarize matches by title and description. Include panel and section counts when they help.
- Do not attach dashboards when you are only listing or comparing them.

## After rendering

- Render only the final dashboard attachment. Never render individual visualization attachments during composition.
- Remember \`attachment_id\`. On later updates, pass it back as \`dashboardAttachmentId\`.
- Use returned panel \`id\` values for later edits and removals. Section ids come back from \`set_layout\`. Never invent an \`attachment_id\`, panel id, or section id.
- If \`data.failures\` is present, explain each failed panel and report its \`type\`, \`identifier\`, and \`error\`.

## Rendering edge cases

- If the user asks to update a dashboard and no \`attachment_id\` is in context, ask which dashboard they mean or offer to create a new one.
- If generation fails, surface the returned error. Do not retry blindly.`;

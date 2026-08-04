/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachmentTools } from '@kbn/agent-builder-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';

const guidance = `## Kibana Workflow

In Kibana, a dashboard request follows: resolve inputs → draft/generate + visual QA → persist once → render.

1. **Resolve inputs**:
   - To work with a saved dashboard, search for it with \`platform.core.sml_search\`, then attach it with \`platform.core.sml_attach\` using the exact \`entry_id\` from the search result. The attached \`${DASHBOARD_ATTACHMENT_TYPE}\` attachment is your editable working copy; pass its \`attachment_id\` to generation as \`dashboardAttachmentId\`.
   - To put an existing visualization onto a dashboard, read that visualization attachment's content with \`${attachmentTools.read}\` and pass its configuration as a \`source: "config"\` panel input (with panel \`type: "vis"\` and \`config\`). The generation core never reads attachments itself, so the visualization config must be passed by value here.
2. **Generate as a draft** (while iterating with screenshots):
   - Call ${dashboardTools.generateDashboard} with \`persistAttachment: false\`, \`dashboardAttachmentId\` set to the dashboard you are editing (omit it for a new dashboard), and your batched \`operations\`. The live dashboard updates mid-round; a hidden draft is kept — **no user-visible attachment is published yet**.
   - It returns \`data.draft_id\`, \`data.persisted: false\`, a compact \`data.dashboard\` summary (panels may include \`authoring_note\`), and optional \`data.failures\`. On follow-up draft calls, pass \`data.draft_id\` as \`dashboardAttachmentId\`. Do **not** pass the dashboard payload back into any tool. Do **not** \`render_attachment\` until after persist.
3. **Visual validation** (required after a successful generate that changed layout or panels):
   - Call \`browser_capture_dashboard_screenshot\` **alone** (never in parallel) with \`settle_ms\` of at least \`1500\`.
   - Inspect the screenshot and briefly describe issues (overlap, empty/broken charts, cramped titles, uneven composition). Fix with another ${dashboardTools.generateDashboard} call still using \`persistAttachment: false\` and the \`draft_id\`, then screenshot again only if you made another visual change.
   - Skip the screenshot when generation failed or when the call made no visible UI change (e.g. metadata-only with no layout impact).
4. **Persist once**, then **render**:
   - When the dashboard looks good, call ${dashboardTools.generateDashboard} with \`persistAttachment: true\` and \`dashboardAttachmentId\` set to the \`draft_id\` (operations may be empty). This publishes a **single** user-visible \`${DASHBOARD_ATTACHMENT_TYPE}\` attachment.
   - Only then render inline with the returned \`attachment_id\` and \`version\`:
     \`<render_attachment id="{attachment_id}" version="{version}" />\`
   - One-shot creates with no screenshot loop may omit \`persistAttachment\` (defaults to true).

## Discovering Dashboards

- When a user asks what dashboards are available, search with \`platform.core.sml_search\`.
- Use specific keywords from the user's request. For a broad listing, you may use \`keywords: ["*"]\`.
- Summarize matches in plain language by title and description, and include lightweight structure when available such as panel and section counts.
- Do **not** attach dashboards by default when only listing or comparing available dashboards.

## After Rendering

- Render only the final persisted dashboard attachment inline, as the last part of your response, after any text. Never render drafts or individual visualization attachments during dashboard composition.
- Remember the dashboard's \`attachment_id\`. On later updates, pass the same \`attachment_id\` back as \`dashboardAttachmentId\` so generation edits the existing dashboard in place.
- Use returned panel \`id\` values for future panel removals, and section \`id\` values for future section-targeted changes.
- Never invent an \`attachment_id\`, panel \`id\`, or \`sectionId\`. Reuse values returned by prior tool results.
- If the generation result includes \`data.failures\`, explain which panel creations failed and report each returned \`type\`, \`identifier\`, and \`error\`.

## Rendering Edge Cases

- If the user asks to update a dashboard but no \`attachment_id\` is available in conversation context, ask which dashboard they mean or offer to create a new one.
- If generation fails, surface the returned error message rather than retrying blindly.`;
export const kibanaRendering: DashboardGuidanceModule = {
  guidance,
};

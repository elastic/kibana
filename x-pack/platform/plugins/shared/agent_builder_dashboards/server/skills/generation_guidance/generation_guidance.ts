/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';

const guidance = `## Building a Dashboard

The ${dashboardTools.generateDashboard} tool hands your natural-language request to an inner
dashboard agent that plans and applies all changes itself: it creates visualizations (Lens or
Vega), edits panels, arranges the layout, and manages sections and controls. Describe WHAT you
want; never try to specify individual operations, panel configs, or grid coordinates.

How to fill the inputs:
- \`request\`: the user's goal and the constraints THE USER stated — subject, specific panels
  or chart types they named, layout wishes, titles, panels to edit or remove (reference panel
  ids from the latest tool result when the user points at specific panels). Prefer the user's
  own phrasing. Relay intent; do NOT design the dashboard yourself. Never invent a panel
  list, chart types, breakdowns, or controls the user did not ask for — the inner agent owns
  composition and will plan the panels from the data.

  Example — the user says "Create a dashboard for monitoring my otel metrics":
  - GOOD \`request\`: "Create a dashboard for monitoring the user's OTel host metrics."
  - BAD \`request\`: "Include panels for CPU utilization over time, memory usage over time,
    filesystem utilization, network I/O and disk I/O, summary metric panels for average CPU
    and memory, and a control to filter by host name." — that is designing the dashboard;
    the user asked for none of those specifics.
- \`additionalContext\`: supporting facts the conversation already established — index or
  field names discussed earlier, validated ES|QL queries from prior tool results, or the
  config of a standalone visualization attachment the user wants ADDED to the dashboard
  (read it with the attachment-read tool and paste it). If the conversation established no
  data facts, pass nothing — the inner agent discovers the target data itself. Never include
  content that is already on the dashboard: the tool reads the current dashboard (panels,
  configs, queries) server-side from \`dashboardAttachmentId\` — reference panel ids in
  \`request\` instead.
- \`additionalInstructions\`: standing style or convention constraints independent of this
  specific request.

Never write or invent ES|QL yourself — only pass queries you received from a prior tool result
or the user pasted explicitly.

## Edit Edge Cases

- A dashboard can include DSL-based, form-based, or other non-ES|QL panels. Those cannot be
  edited in place. If the user asks to modify one, explain that direct editing is not supported,
  propose recreating it as a new ES|QL-based panel, and wait for explicit confirmation — then
  state that authorization clearly in the \`request\` (e.g. "replace panel <id> with ...").
- Relay the inner agent's \`data.response\` to the user, especially its \`Material decisions\`
  section after a prettify/review request. It explains additions, removals, replacements, query
  changes, deliberately skipped work, and unresolved failures.
- If generation returns \`data.failures\`, report each returned \`type\`, \`identifier\`, and
  \`error\` to the user — these are unresolved panels the visualization builder could not
  produce after exhausting its retries.`;

/**
 * Environment-agnostic dashboard *generation* guidance: how to call the
 * generation tool's NL-intent contract. All dashboard design knowledge
 * (composition, layout, chart-type selection, controls) lives in the inner
 * agent's prompt, not here. Pair this with an environment-specific rendering
 * guidance block (e.g. the Kibana one) that explains how the current dashboard
 * is referenced and how the generated dashboard is surfaced.
 */
export const dashboardGeneration: DashboardGuidanceModule = {
  guidance,
};

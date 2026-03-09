/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { manageDashboardTool } from '../tools';
import { dashboardTools } from '../../common';

export const dashboardManagementSkill = defineSkillType({
  id: 'dashboard-management',
  name: 'dashboard-management',
  basePath: 'skills/platform/dashboard',
  description:
    'Compose and update in-memory Kibana dashboards using ordered operations and visualization attachment IDs.',
  content: `## When to Use This Skill

Use this skill when:
- A user asks to create a dashboard composed of one or more visualizations.
- A user asks to update an in-memory dashboard from a previous tool result.
- A request includes ordered panel-management actions (add, remove, markdown, metadata).
- You need to add existing visualization attachments to a dashboard.

Do **not** use this skill when:
- The user asks for a standalone chart without asking for a dashboard.
- The user needs help discovering data, fields, or query logic.
- The user asks about saved or persisted dashboards in Kibana. This skill manages in-memory dashboards only.

## Workflow Handoff

Use this end-to-end sequence for dashboard requests:

1. **Explore the data** when index, field, or query context is unclear.
2. **Create visualizations** to produce panel-ready \`attachment_id\` values.
3. **Compose or update the dashboard** in this skill using ordered operations with ${dashboardTools.manageDashboard}.

Enter this skill with:
- An ordered list of visualization \`attachment_id\` values matching desired panel order.
- A \`dashboardAttachmentId\` when updating an existing dashboard.

## Available Tool

- **${dashboardTools.manageDashboard}**: Create or update an in-memory dashboard with ordered \`operations[]\`.

## Core Instructions

### Step 1: Compose ordered dashboard operations

Use this contract:

\`\`\`json
{
  "dashboardAttachmentId": "optional-existing-id",
  "operations": [
    { "operation": "set_metadata", "title": "optional", "description": "optional" },
    { "operation": "upsert_markdown", "markdownContent": "..." },
    { "operation": "add_panels_from_attachments", "attachmentIds": ["single-attachment-id"] },
    { "operation": "remove_panels", "panelIds": [] }
  ]
}
\`\`\`

#### Creating a new dashboard

When creating a dashboard, prefer this sequence:
1. \`set_metadata\` to set title/description
2. \`upsert_markdown\` to add a summary panel
3. Add visualizations with **separate** \`add_panels_from_attachments\` operations in the exact display order (one attachment ID per operation)

If you omit metadata on a new dashboard, creation can fail.

#### Updating an existing dashboard

1. Extract the dashboard attachment ID from the previous tool result: look for \`data.dashboardAttachment.id\`.
2. Call ${dashboardTools.manageDashboard} with \`dashboardAttachmentId\` and an ordered \`operations[]\` list.
3. Use:
   - ordered \`add_panels_from_attachments\` operations to add new or previously created visualization attachments (one per operation when order matters)
   - \`remove_panels\` to remove by \`panelId\`
   - \`set_metadata\` / \`upsert_markdown\` for dashboard metadata and summary updates

**Keeping the markdown summary in sync:** After adding or removing panels, the existing markdown summary panel may no longer reflect the current dashboard content. If the update changes the panel composition (new panels added or existing ones removed), check whether the markdown summary still accurately describes the dashboard. If it does not, ask the user whether they would like you to update the markdown summary to match the new dashboard state. Do not update it silently — let the user decide.

### Step 2: Interpret results and report clearly

After a successful call, the tool returns:
- \`data.dashboardAttachment.id\`: the attachment ID needed for future updates.
- \`data.dashboardAttachment.content.panels\`: array of \`{ type, panelId, title }\` for each panel on the dashboard.
- \`data.failures\`: array of \`{ type, identifier, error }\` for attachment resolution failures. Only present when there are failures.
- \`data.version\`: the version number of the dashboard attachment, incrementing with each update.

See \`./examples/tool-result-format\` for the complete result structure with examples.

**After a successful call:**
- Summarize what was created or updated. List each panel by title so the user knows what is included.
- If \`failures\` is present and non-empty, explain which attachments could not be resolved and include the error message. Offer to recreate those visualizations and retry adding them.
- Remember the \`dashboardAttachment.id\` for follow-up updates. Do not ask the user for it again.

## Dashboard Composition Guidelines

A well-composed dashboard tells a coherent story about the data:

1. **Start with a markdown panel** to set context: what the dashboard monitors, what the data source is, and any important notes.
2. **Lead with high-level metrics** (Metric or Gauge panels): total counts, averages, key performance indicators that give an at-a-glance summary.
3. **Follow with time-series trends** (XY line/area panels): how the key metrics change over time.
4. **Add breakdowns and distributions** (XY bar, Heatmap, Tagcloud panels): top-N rankings, categorical splits, and density views.
5. **Include as many panels as are valuable for the underlying data and user intent.** Let the richness and diversity of the available fields drive the panel count instead of a fixed numeric target.
6. **Every panel should serve a clear purpose.** Do not add panels just to fill space, but do not artificially limit the dashboard when more panels would provide genuine insight.

When the user's request is vague (e.g., "create a dashboard for my logs"), explore the discovered index mapping thoroughly and compose a rich dashboard that covers the breadth of the available data — overview metrics, time-series trends, breakdowns, and distributions. Let the fields drive the panel count rather than defaulting to a minimal set.

## Edge Cases

- **Missing \`attachment_id\` from visualization creation:** Treat that panel as failed for dashboard composition and do not include it in \`attachmentIds\`.
- **Missing dashboard attachment ID on updates:** If the user asks to update a dashboard but the prior \`dashboardAttachment.id\` is not available in conversation context, ask the user to clarify which dashboard they mean or offer to create a new one.
- **User asks to update a panel in place:** Prefer ordered remove + add operations in the same call.

See \`./examples/manage-dashboard-payloads\` for complete payload examples covering all scenarios.
`,
  referencedContent: [
    {
      relativePath: './examples',
      name: 'manage-dashboard-payloads',
      content: `# Manage Dashboard Payload Examples

## Create a new dashboard

\`\`\`json
{
  "operations": [
    {
      "operation": "set_metadata",
      "title": "Web Server Performance",
      "description": "Overview of web server request traffic and host resource usage"
    },
    {
      "operation": "upsert_markdown",
      "markdownContent": "### Web Server Performance\n\nThis dashboard tracks nginx access logs and system metrics across all production hosts."
    },
    {
      "operation": "add_panels_from_attachments",
      "attachmentIds": ["viz-1"]
    },
    {
      "operation": "add_panels_from_attachments",
      "attachmentIds": ["viz-2"]
    },
    {
      "operation": "add_panels_from_attachments",
      "attachmentIds": ["viz-3"]
    }
  ]
}
\`\`\`

## Update a dashboard — ordered remove + add + markdown

\`\`\`json
{
  "dashboardAttachmentId": "abc-123",
  "operations": [
    { "operation": "remove_panels", "panelIds": ["panel-xyz"] },
    {
      "operation": "add_panels_from_attachments",
      "attachmentIds": ["viz-attachment-789"]
    },
    {
      "operation": "upsert_markdown",
      "markdownContent": "### Updated Summary\n\nNow includes response-size trend."
    }
  ]
}
\`\`\`

## Update a dashboard — add existing attachment panels

Use this when the user wants to add a visualization that was already created earlier in the conversation.

\`\`\`json
{
  "dashboardAttachmentId": "abc-123",
  "operations": [
    {
      "operation": "add_panels_from_attachments",
      "attachmentIds": ["viz-attachment-456"]
    }
  ]
}
\`\`\`

## Update a dashboard — metadata only

\`\`\`json
{
  "dashboardAttachmentId": "abc-123",
  "operations": [
    {
      "operation": "set_metadata",
      "title": "Web Server Performance (Production)"
    },
    {
      "operation": "upsert_markdown",
      "markdownContent": "### Updated Summary\n\nNow filtered to production hosts only."
    }
  ]
}
\`\`\`
`,
    },
    {
      relativePath: './examples',
      name: 'tool-result-format',
      content: `# Tool Result Format Reference

## Successful dashboard creation or update

\`\`\`json
{
  "type": "dashboard",
  "data": {
    "version": 1,
    "dashboardAttachment": {
      "id": "abc-123",
      "content": {
        "title": "Web Server Performance",
        "description": "Overview of web server request traffic and host resource usage",
        "panels": [
          { "type": "generic", "panelId": "md-001", "title": "Summary" },
          { "type": "lens", "panelId": "viz-001", "title": "Total Requests" },
          { "type": "lens", "panelId": "viz-002", "title": "Average CPU Usage" },
          { "type": "lens", "panelId": "viz-003", "title": "Requests Over Time" }
        ]
      }
    }
  }
}
\`\`\`

Key fields to remember:
- \`data.dashboardAttachment.id\` — save this value. Pass it as \`dashboardAttachmentId\` in follow-up update calls.
- \`data.dashboardAttachment.content.panels[].panelId\` — use these when the user asks to remove a specific panel via \`remove_panels.panelIds\`.
- \`data.version\` — increments with each update to the dashboard.
- Panels with \`type: "generic"\` are non-visualization panels (e.g., markdown summary). Panels with \`type: "lens"\` are visualizations.

## Successful result with partial failures

\`\`\`json
{
  "type": "dashboard",
  "data": {
    "version": 1,
    "failures": [
      {
        "type": "attachment_panels",
        "identifier": "viz-missing-999",
        "error": "Attachment not found"
      }
    ],
    "dashboardAttachment": {
      "id": "abc-123",
      "content": {
        "title": "Server Metrics",
        "description": "System performance overview",
        "panels": [
          { "type": "lens", "panelId": "viz-001", "title": "CPU Usage Over Time" }
        ]
      }
    }
  }
}
\`\`\`

When \`failures\` is present:
- The dashboard was still created or updated with the panels that succeeded.
- Report each failure to the user: include \`identifier\` (the attachment that failed) and \`error\` (the reason).
- Offer to recreate failed visualizations and retry attachment ingestion.

## Error result

\`\`\`json
{
  "type": "error",
  "data": {
    "message": "Title and description are required when creating a new dashboard.",
    "metadata": {
      "title": null,
      "description": null,
      "dashboardAttachmentId": null
    }
  }
}
\`\`\`

On error, the dashboard was not created or updated. Inform the user about what went wrong and how to fix it (e.g., provide missing required fields).
`,
    },
  ],
  getInlineTools: () => [manageDashboardTool()],
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { manageDashboardTool } from '../tools';
import { dashboardTools } from '../../common';
import { gridLayoutPrompt } from './grid_layout_prompt';

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
    { "operation": "add_panels_from_attachments", "items": [{ "attachmentId": "id", "grid": { "x": 0, "y": 0, "w": 24, "h": 9 }, "sectionId": "optional-section-id" }] },
    { "operation": "remove_panels", "panelIds": [] },
    { "operation": "add_section", "title": "Section Name", "panels": [{ "attachmentId": "id", "grid": { "x": 0, "y": 0, "w": 24, "h": 9 } }] },
    { "operation": "move_panels_to_section", "panelIds": ["panel-id"], "sectionId": "section-id-or-null" },
    { "operation": "remove_section", "sectionId": "section-id", "panelAction": "promote" }
  ]
}
\`\`\`

#### Creating a new dashboard

When creating a dashboard, prefer this sequence:
1. \`set_metadata\` to set title/description
2. \`upsert_markdown\` to add a summary panel
3. Add visualizations with \`add_panels_from_attachments\` using \`items[]\` — each item specifies the \`attachmentId\` and a required \`grid: { w, h }\` for dashboard layout

If you omit metadata on a new dashboard, creation can fail.

#### Updating an existing dashboard

1. Extract the dashboard attachment ID from the previous tool result: look for \`data.dashboardAttachment.id\`.
2. Call ${dashboardTools.manageDashboard} with \`dashboardAttachmentId\` and an ordered \`operations[]\` list.
3. Use:
   - \`add_panels_from_attachments\` with \`items[]\` to add visualization attachments with their dashboard grid layout. Use optional \`sectionId\` on each item to place a panel directly into an existing section.
   - \`add_section\` to create a new section with inline panels
   - \`move_panels_to_section\` to move existing panels into a section, between sections, or out to top-level (\`sectionId: null\`)
   - \`remove_section\` to remove a section (\`panelAction: "promote"\` keeps panels, \`"delete"\` removes them)
   - \`remove_panels\` to remove by \`panelId\` (works regardless of whether the panel is in a section or top-level)
   - \`set_metadata\` / \`upsert_markdown\` for dashboard metadata and summary updates

**Using \`sectionId\` from previous results:** After creating sections, the tool result includes \`content.sections[]\` with each section's \`sectionId\`. Use these IDs in subsequent calls for \`add_panels_from_attachments\` (via \`items[].sectionId\`), \`move_panels_to_section\`, or \`remove_section\`. Never invent section IDs — always use values from previous tool results.

**Keeping the markdown summary in sync:** After adding or removing panels, the existing markdown summary panel may no longer reflect the current dashboard content. If the update changes the panel composition (new panels added or existing ones removed), check whether the markdown summary still accurately describes the dashboard. If it does not, ask the user whether they would like you to update the markdown summary to match the new dashboard state. Do not update it silently — let the user decide.

### Step 2: Interpret results and report clearly

After a successful call, the tool returns:
- \`data.dashboardAttachment.id\`: the attachment ID needed for future updates.
- \`data.dashboardAttachment.content.panels\`: array of \`{ type, panelId, title }\` for each top-level panel (not in any section).
- \`data.dashboardAttachment.content.sections\`: array of \`{ sectionId, title, collapsed, panels[] }\` for each section. Use \`sectionId\` values for subsequent operations.
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

### Section guidelines

Use sections to group related panels when the dashboard spans multiple topics or has 6+ panels. Sections make complex dashboards easier to navigate with collapsible groups.

- **New dashboards**: Use your judgment. If panels naturally cluster into distinct topics (e.g., "Overview Metrics", "Traffic Trends", "Error Breakdowns"), use \`add_section\` to organize them. For simple single-topic dashboards with few panels, keep a flat layout.
- **Existing dashboards without sections**: Do not auto-introduce sections. If the user asks to reorganize, confirm first, then use \`add_section\` (with empty panels) followed by \`move_panels_to_section\` in a subsequent call (since section IDs are server-generated).
- **Existing dashboards with sections**: When adding panels, decide whether the panel fits an existing section (use \`sectionId\` on \`add_panels_from_attachments\`) or belongs at the top level. Respect existing section structure.
- **New sections are always created with \`collapsed: false\`**. Respect existing \`collapsed\` state on updates.

## Edge Cases

- **Missing \`attachment_id\` from visualization creation:** Treat that panel as failed for dashboard composition and do not include it in \`attachmentIds\`.

${gridLayoutPrompt}

- **Missing dashboard attachment ID on updates:** If the user asks to update a dashboard but the prior \`dashboardAttachment.id\` is not available in conversation context, ask the user to clarify which dashboard they mean or offer to create a new one.
- **User asks to update a panel in place:** Prefer ordered remove + add operations in the same call.

See \`./examples/manage-dashboard-payloads\` for complete payload examples covering all scenarios.
`,
  referencedContent: [
    {
      relativePath: './examples',
      name: 'manage-dashboard-payloads',
      content: `# Manage Dashboard Payload Examples

## Create a new dashboard (flat layout)

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
      "items": [
        { "attachmentId": "viz-1", "grid": { "x": 0, "y": 0, "w": 24, "h": 5 } },
        { "attachmentId": "viz-2", "grid": { "x": 24, "y": 0, "w": 24, "h": 5 } },
        { "attachmentId": "viz-3", "grid": { "x": 0, "y": 5, "w": 48, "h": 8 } }
      ]
    }
  ]
}
\`\`\`

## Create a new dashboard with sections

\`\`\`json
{
  "operations": [
    {
      "operation": "set_metadata",
      "title": "Web Server Performance",
      "description": "Overview of nginx traffic and host resources"
    },
    {
      "operation": "upsert_markdown",
      "markdownContent": "### Web Server Performance\n\nThis dashboard tracks nginx access logs and system metrics."
    },
    {
      "operation": "add_section",
      "title": "Key Metrics",
      "panels": [
        { "attachmentId": "viz-1", "grid": { "x": 0, "y": 0, "w": 12, "h": 5 } },
        { "attachmentId": "viz-2", "grid": { "x": 12, "y": 0, "w": 12, "h": 5 } },
        { "attachmentId": "viz-3", "grid": { "x": 24, "y": 0, "w": 12, "h": 5 } },
        { "attachmentId": "viz-4", "grid": { "x": 36, "y": 0, "w": 12, "h": 5 } }
      ]
    },
    {
      "operation": "add_section",
      "title": "Traffic Trends",
      "panels": [
        { "attachmentId": "viz-5", "grid": { "x": 0, "y": 0, "w": 24, "h": 12 } },
        { "attachmentId": "viz-6", "grid": { "x": 24, "y": 0, "w": 24, "h": 12 } }
      ]
    }
  ]
}
\`\`\`

## Update — add a new section to an existing dashboard

\`\`\`json
{
  "dashboardAttachmentId": "abc-123",
  "operations": [
    {
      "operation": "add_section",
      "title": "Security Events",
      "panels": [
        { "attachmentId": "viz-10", "grid": { "x": 0, "y": 0, "w": 48, "h": 12 } }
      ]
    }
  ]
}
\`\`\`

## Update — add panels to an existing section

Use \`sectionId\` from a previous tool result to place panels directly into a section.

\`\`\`json
{
  "dashboardAttachmentId": "abc-123",
  "operations": [
    {
      "operation": "add_panels_from_attachments",
      "items": [
        { "attachmentId": "viz-9", "grid": { "x": 0, "y": 12, "w": 24, "h": 10 }, "sectionId": "sec-uuid-1" }
      ]
    }
  ]
}
\`\`\`

## Update — move panels between sections

\`\`\`json
{
  "dashboardAttachmentId": "abc-123",
  "operations": [
    {
      "operation": "move_panels_to_section",
      "panelIds": ["viz-001", "viz-002"],
      "sectionId": "sec-uuid-2"
    }
  ]
}
\`\`\`

## Update — remove a section, keep its panels

\`\`\`json
{
  "dashboardAttachmentId": "abc-123",
  "operations": [
    {
      "operation": "remove_section",
      "sectionId": "sec-uuid-2",
      "panelAction": "promote"
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
      "items": [{ "attachmentId": "viz-attachment-789", "grid": { "x": 0, "y": 0, "w": 24, "h": 8 } }]
    },
    {
      "operation": "upsert_markdown",
      "markdownContent": "### Updated Summary\n\nNow includes response-size trend."
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
          { "type": "generic", "panelId": "md-001", "title": "Overview" }
        ],
        "sections": [
          {
            "sectionId": "sec-uuid-1",
            "title": "Key Metrics",
            "collapsed": false,
            "panels": [
              { "type": "lens", "panelId": "viz-001", "title": "Total Requests", "grid": { "x": 0, "y": 0, "w": 12, "h": 5 } },
              { "type": "lens", "panelId": "viz-002", "title": "Average CPU Usage", "grid": { "x": 12, "y": 0, "w": 12, "h": 5 } }
            ]
          },
          {
            "sectionId": "sec-uuid-2",
            "title": "Traffic Trends",
            "collapsed": false,
            "panels": [
              { "type": "lens", "panelId": "viz-003", "title": "Requests Over Time", "grid": { "x": 0, "y": 0, "w": 48, "h": 12 } }
            ]
          }
        ]
      }
    }
  }
}
\`\`\`

Key fields to remember:
- \`data.dashboardAttachment.id\` — save this value. Pass it as \`dashboardAttachmentId\` in follow-up update calls.
- \`data.dashboardAttachment.content.panels[]\` — top-level panels (not in any section). Use \`panelId\` for \`remove_panels\` or \`move_panels_to_section\`.
- \`data.dashboardAttachment.content.sections[]\` — ordered array of sections. Each section has \`sectionId\`, \`title\`, \`collapsed\`, and \`panels[]\`. Use \`sectionId\` for \`add_panels_from_attachments\` (via \`items[].sectionId\`), \`move_panels_to_section\`, or \`remove_section\`.
- \`data.dashboardAttachment.content.panels[].grid\` — current position and size of each panel. Use this to find gaps when adding new panels to an existing dashboard.
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
        ],
        "sections": []
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

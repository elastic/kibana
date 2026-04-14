/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { A2UIComponentType, KIBANA_EUI_CATALOG_ID } from '@kbn/agent-builder-common/attachments';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

const componentTypes = Object.values(A2UIComponentType).join(', ');

export const a2uiSurfaceCreationSkill = defineSkillType({
  id: 'a2ui-surface-creation',
  name: 'a2ui-surface-creation',
  basePath: 'skills/platform/a2ui',
  description:
    'Create rich, structured UI surfaces inline in the conversation using the A2UI declarative component protocol.',
  content: `## When to Use This Skill

Use this skill when:
- The user asks for a summary, overview, dashboard-like layout, or structured data display that goes beyond plain text or a single chart.
- You need to compose multiple pieces of information (stats, descriptions, tables, badges, field values) into a cohesive visual layout.
- The response benefits from structured UI elements like stat cards, description lists, tables, or grouped panels rather than markdown.
- The user asks to "show me" or "display" information in a formatted way.

Do **not** use this skill when:
- The user only needs a single chart or visualization. Use the visualization-creation skill instead.
- A plain text or markdown response is sufficient.
- The user is asking for raw data export or document retrieval.

## Available Tools

- **${platformCoreTools.createA2UISurface}**: Create or update an A2UI surface attachment with a declarative component tree.
- **${platformCoreTools.search}**: Retrieve documents to populate the surface data model.
- **${platformCoreTools.executeEsql}**: Run ES|QL queries to gather data for surface components.
- **${platformCoreTools.createVisualization}**: Create visualization attachments that can be embedded in A2UI surfaces via VisualizationRef.

## A2UI Surface Creation Workflow

1. **Gather the data** the surface will display.
   - Use search or ES|QL tools to retrieve the necessary information.
   - Structure the results into a data_model object for data-bound components.

2. **Design the component tree.**
   - Start with a \`root\` component (typically Column or Row) that contains all other components.
   - Build the layout top-down: root container -> sections -> individual components.
   - Use data binding (\`{path: "/key"}\`) to connect components to the data_model.

3. **Call ${platformCoreTools.createA2UISurface}.**
   - Provide surface_id (unique within the conversation), title, components, and data_model.
   - For updates to an existing surface, pass the attachment_id.

4. **Render the surface inline.**
   - After the tool returns an attachment_id, include \`<render_attachment id="ATTACHMENT_ID">\` in the response so the user sees the surface.

## Component Reference

Supported types: ${componentTypes}

### Layout Components
- **Row**: Horizontal flex container. Props: \`children\` (array of component ids), \`align\`, \`justify\`
- **Column**: Vertical flex container. Props: \`children\` (array of component ids), \`align\`, \`justify\`
- **Card**: Panel wrapper. Props: \`child\` (single component id), \`title\`
- **Divider**: Horizontal rule. Props: \`size\` ("s"|"m"|"l")

### Content Components
- **Text**: Text block. Props: \`text\`, \`variant\` ("title"|"body"|"caption")
- **Stat**: Metric card. Props: \`title\` (label), \`value\`, \`description\`
- **Badge**: Label badge. Props: \`text\`, \`color\`
- **Icon**: EUI icon. Props: \`name\` (EUI icon name), \`color\`, \`size\`
- **FieldValue**: Key-value display. Props: \`field_name\`, \`field_value\`

### Data Components
- **Table**: Data table. Props: \`columns\` [{field, name}], \`data_path\` (JSON Pointer to array in data_model)
- **DescriptionList**: Key-value list. Props: \`items\` [{title, description}]

### Interactive / Embedding Components
- **Button**: Clickable action. Props: \`text\`, \`action\` {event: {name, context}}, \`variant\` ("primary"|"default")
- **VisualizationRef**: Embeds a visualization attachment. Props: \`attachment_id\`, \`version\`

### Data Binding
Any string prop can be replaced with \`{path: "/json/pointer"}\` to resolve values from the \`data_model\` at render time using JSON Pointer (RFC 6901).

## Catalog ID

Always use: \`${KIBANA_EUI_CATALOG_ID}\`. The tool sets this automatically.

## Best Practices

- Keep surfaces focused: one surface per logical unit of information.
- Prefer Stat components for KPIs and metrics, DescriptionList for metadata, Table for tabular data.
- Use meaningful surface_id values (e.g. "host_overview", "alert_summary").
- Limit component tree depth to keep layouts readable (max 10 levels).
- When combining with visualizations, create the visualization first, then embed it via VisualizationRef.
`,
  referencedContent: [
    {
      relativePath: './examples',
      name: 'a2ui-surface-examples',
      content: `# A2UI Surface Examples

## Host Summary Surface

\`\`\`json
{
  "surface_id": "host_summary",
  "title": "Host Summary",
  "components": [
    {"id": "root", "component": "Column", "children": ["stats_row", "details"]},
    {"id": "stats_row", "component": "Row", "children": ["cpu_stat", "mem_stat"]},
    {"id": "cpu_stat", "component": "Stat", "title": "CPU Usage", "value": {"path": "/cpu_percent"}, "description": "Average over last hour"},
    {"id": "mem_stat", "component": "Stat", "title": "Memory", "value": {"path": "/memory_percent"}, "description": "Current usage"},
    {"id": "details", "component": "DescriptionList", "items": [
      {"title": "Hostname", "description": {"path": "/hostname"}},
      {"title": "OS", "description": {"path": "/os"}},
      {"title": "Uptime", "description": {"path": "/uptime"}}
    ]}
  ],
  "data_model": {
    "cpu_percent": "72%",
    "memory_percent": "4.2 GB / 8 GB",
    "hostname": "web-server-01",
    "os": "Ubuntu 22.04",
    "uptime": "14 days, 6 hours"
  }
}
\`\`\`

## Alert Overview with Embedded Visualization

\`\`\`json
{
  "surface_id": "alert_overview",
  "title": "Critical Alerts Overview",
  "components": [
    {"id": "root", "component": "Column", "children": ["header_row", "divider1", "chart", "divider2", "table"]},
    {"id": "header_row", "component": "Row", "children": ["total_badge", "critical_stat", "high_stat"]},
    {"id": "total_badge", "component": "Badge", "text": {"path": "/total_count"}, "color": "danger"},
    {"id": "critical_stat", "component": "Stat", "title": "Critical", "value": {"path": "/critical_count"}},
    {"id": "high_stat", "component": "Stat", "title": "High", "value": {"path": "/high_count"}},
    {"id": "divider1", "component": "Divider", "size": "m"},
    {"id": "chart", "component": "VisualizationRef", "attachment_id": "alert-trend-viz-123"},
    {"id": "divider2", "component": "Divider", "size": "m"},
    {"id": "table", "component": "Table", "columns": [
      {"field": "rule", "name": "Rule"},
      {"field": "severity", "name": "Severity"},
      {"field": "count", "name": "Count"}
    ], "data_path": "/top_rules"}
  ],
  "data_model": {
    "total_count": "47 alerts",
    "critical_count": "12",
    "high_count": "35",
    "top_rules": [
      {"rule": "Brute Force Login", "severity": "critical", "count": 8},
      {"rule": "Suspicious Process", "severity": "high", "count": 15},
      {"rule": "Network Anomaly", "severity": "high", "count": 12}
    ]
  }
}
\`\`\`

## Simple Metric Card

\`\`\`json
{
  "surface_id": "disk_usage",
  "title": "Disk Usage",
  "components": [
    {"id": "root", "component": "Card", "child": "content", "title": "Storage"},
    {"id": "content", "component": "Column", "children": ["usage_stat", "path_info"]},
    {"id": "usage_stat", "component": "Stat", "title": "Used", "value": "78%", "description": "156 GB of 200 GB"},
    {"id": "path_info", "component": "FieldValue", "field_name": "Mount", "field_value": "/data"}
  ]
}
\`\`\`
`,
    },
  ],
  getRegistryTools: () => [
    platformCoreTools.createA2UISurface,
    platformCoreTools.search,
    platformCoreTools.executeEsql,
    platformCoreTools.createVisualization,
  ],
});

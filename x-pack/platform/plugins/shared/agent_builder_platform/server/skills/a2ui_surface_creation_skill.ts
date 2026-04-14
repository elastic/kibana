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
    'Compose multi-metric summaries, dashboard-like overviews, and structured layouts that combine stats, tables, descriptions, and embedded visualizations into a single inline surface.',
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
- **Card**: Panel wrapper. Props: \`child\` (single component id), \`title\`, \`color\` (plain|subdued|primary|success|warning|danger|accent|transparent)
- **Divider**: Horizontal rule. Props: \`size\` ("s"|"m"|"l"|"xl"|"xxl")

### Content Components
- **Text**: Text block. Props: \`text\`, \`variant\` ("title"|"body"|"caption"), \`color\` (default|subdued|success|accent|warning|danger)
- **Stat**: Metric card. Props: \`title\` (label), \`value\`, \`description\`, \`color\` (subdued|primary|accent|success|warning|danger)
- **Badge**: Label badge. Props: \`text\`, \`color\` (default|hollow|primary|success|accent|warning|danger, or any hex)
- **Icon**: EUI icon. Props: \`name\` (EUI icon name), \`color\` (default|subdued|primary|success|accent|warning|danger, or any hex), \`size\`
- **FieldValue**: Key-value display. Props: \`field_name\`, \`field_value\`

### Data Components
- **Table**: Data table. Props: \`columns\` [{field, name}], \`data_path\` (JSON Pointer to array in data_model)
- **DescriptionList**: Key-value list. Props: \`items\` [{title, description}]

### Interactive / Embedding Components
- **Button**: Clickable action. Props: \`text\`, \`action\` {event: {name, context}}, \`variant\` ("primary"|"default"), \`color\` (primary|success|warning|danger|accent|text)
- **VisualizationRef**: Embeds a visualization attachment. Props: \`attachment_id\`, \`version\`

### Data Binding
Any string prop can be replaced with \`{path: "/json/pointer"}\` to resolve values from the \`data_model\` at render time using JSON Pointer (RFC 6901).

## Catalog ID

Always use: \`${KIBANA_EUI_CATALOG_ID}\`. The tool sets this automatically.

## Semantic Color Guidelines

Use the \`color\` prop to add meaning, not decoration. Color should communicate the nature of a value at a glance.

**Available semantic colors:** \`success\`, \`warning\`, \`danger\`, \`primary\`, \`accent\`, \`subdued\`

### When to use each color

**success** — The value is healthy, on target, or positive.
- Availability/uptime above a healthy threshold (e.g. ≥ 99%)
- Error rates near zero
- Completion or success rates above target
- Positive growth, profit, or surplus

**warning** — The value is degraded or approaching a threshold.
- Availability between ~90–99%
- Elevated error or failure rates
- Approaching capacity limits (e.g. disk 80–90%)
- Latency above normal but not critical

**danger** — The value is critical, failing, or requires attention.
- Availability below ~90%, significant outages
- High error/failure rates
- Resource exhaustion (disk > 90%, memory maxed)
- Security alerts, critical counts

**primary** — Neutral emphasis to draw attention to a headline value.
- The single most important metric in a surface (e.g. total revenue, total requests)
- Values that are informational rather than good or bad

**accent** — Secondary emphasis for supplementary highlights.
- Differentiating a secondary metric from the primary one
- Highlighting categories or segments (e.g. a product category)

**subdued** — Low-emphasis, supporting context.
- Comparative/reference values (e.g. previous period)
- Unchanged or stable metrics that need no emphasis

### Contextual thresholds

The same metric can warrant different colors depending on its value. Apply color based on the actual number, not the label:
- A "Success Rate" of 99.9% → \`success\`; of 92% → \`warning\`; of 78% → \`danger\`
- "CPU Usage" of 30% → \`success\`; 75% → \`warning\`; 95% → \`danger\`
- "Disk Free" of 50 GB → \`success\`; 10 GB → \`warning\`; 2 GB → \`danger\`

When you cannot determine appropriate thresholds, omit the color and let the default apply.

### Color applies to these components

| Component | What gets colored | Good use cases |
|-----------|------------------|----------------|
| Stat | The value number | KPIs, rates, percentages, counts |
| Badge | Background fill | Status labels, severity tags, category tags |
| Text | The text content | Callout messages, inline status notes |
| Card | Panel background | Grouping related items by status (e.g. a danger card for critical alerts) |
| Button | Button color | Confirm/destructive actions |
| Icon | Icon color | Status indicators next to labels |

## Best Practices

- Keep surfaces focused: one surface per logical unit of information.
- Prefer Stat components for KPIs and metrics, DescriptionList for metadata, Table for tabular data.
- Use meaningful surface_id values (e.g. "host_overview", "alert_summary").
- Limit component tree depth to keep layouts readable (max 10 levels).
- When combining with visualizations, create the visualization first, then embed it via VisualizationRef.
- Apply color to Stats and Badges where the value has a clear healthy/degraded/critical interpretation. Do not color every component.
`,
  referencedContent: [
    {
      relativePath: './examples',
      name: 'a2ui-surface-examples',
      content: `# A2UI Surface Examples

## Host Summary with Contextual Colors

\`\`\`json
{
  "surface_id": "host_summary",
  "title": "Host Summary",
  "components": [
    {"id": "root", "component": "Column", "children": ["stats_row", "details"]},
    {"id": "stats_row", "component": "Row", "children": ["cpu_stat", "mem_stat", "uptime_stat"]},
    {"id": "cpu_stat", "component": "Stat", "title": "CPU Usage", "value": {"path": "/cpu_percent"}, "description": "Average over last hour", "color": "warning"},
    {"id": "mem_stat", "component": "Stat", "title": "Memory", "value": {"path": "/memory_percent"}, "description": "Current usage"},
    {"id": "uptime_stat", "component": "Stat", "title": "Uptime", "value": {"path": "/uptime_percent"}, "color": "success"},
    {"id": "details", "component": "DescriptionList", "items": [
      {"title": "Hostname", "description": {"path": "/hostname"}},
      {"title": "OS", "description": {"path": "/os"}},
      {"title": "Uptime", "description": {"path": "/uptime"}}
    ]}
  ],
  "data_model": {
    "cpu_percent": "72%",
    "memory_percent": "4.2 GB / 8 GB",
    "uptime_percent": "99.97%",
    "hostname": "web-server-01",
    "os": "Ubuntu 22.04",
    "uptime": "14 days, 6 hours"
  }
}
\`\`\`

Note: CPU at 72% gets \`warning\` (elevated). Uptime at 99.97% gets \`success\` (healthy). Memory is shown without color because GB usage does not map to a clear threshold.

## Alert Overview with Severity Colors

\`\`\`json
{
  "surface_id": "alert_overview",
  "title": "Critical Alerts Overview",
  "components": [
    {"id": "root", "component": "Column", "children": ["header_row", "divider1", "chart", "divider2", "table"]},
    {"id": "header_row", "component": "Row", "children": ["total_stat", "critical_stat", "high_stat"]},
    {"id": "total_stat", "component": "Stat", "title": "Total Alerts", "value": {"path": "/total_count"}, "color": "primary"},
    {"id": "critical_stat", "component": "Stat", "title": "Critical", "value": {"path": "/critical_count"}, "color": "danger"},
    {"id": "high_stat", "component": "Stat", "title": "High", "value": {"path": "/high_count"}, "color": "warning"},
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
    "total_count": "47",
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

Note: Total uses \`primary\` (headline metric, neutral). Critical uses \`danger\`. High uses \`warning\`.

## Ecommerce KPI Surface with Revenue Coloring

\`\`\`json
{
  "surface_id": "ecommerce_kpis",
  "title": "Ecommerce Store KPIs",
  "components": [
    {"id": "root", "component": "Column", "children": ["kpi_row", "status_row"]},
    {"id": "kpi_row", "component": "Row", "children": ["revenue_stat", "orders_stat", "avg_order_stat"]},
    {"id": "revenue_stat", "component": "Stat", "title": "Total Revenue", "value": "$350,884", "color": "primary"},
    {"id": "orders_stat", "component": "Stat", "title": "Orders", "value": "4,675"},
    {"id": "avg_order_stat", "component": "Stat", "title": "Avg Order Value", "value": "$75.05"},
    {"id": "status_row", "component": "Row", "children": ["success_badge", "cancel_badge"]},
    {"id": "success_badge", "component": "Badge", "text": "98.2% fulfillment", "color": "success"},
    {"id": "cancel_badge", "component": "Badge", "text": "1.8% cancellation", "color": "hollow"}
  ]
}
\`\`\`

Note: Revenue uses \`primary\` (headline figure, not inherently good/bad). Fulfillment badge uses \`success\` (high rate). Cancellation badge uses \`hollow\` (low-emphasis neutral). Order count and avg order value are uncolored because they are pure informational metrics.

## Simple Metric Card

\`\`\`json
{
  "surface_id": "disk_usage",
  "title": "Disk Usage",
  "components": [
    {"id": "root", "component": "Card", "child": "content", "title": "Storage"},
    {"id": "content", "component": "Column", "children": ["usage_stat", "path_info"]},
    {"id": "usage_stat", "component": "Stat", "title": "Used", "value": "78%", "description": "156 GB of 200 GB", "color": "warning"},
    {"id": "path_info", "component": "FieldValue", "field_name": "Mount", "field_value": "/data"}
  ]
}
\`\`\`

Note: Disk at 78% gets \`warning\` (approaching capacity).
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

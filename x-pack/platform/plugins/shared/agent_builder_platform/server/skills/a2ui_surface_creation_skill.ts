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
    'Present data summaries, key-metric overviews, and dashboard-like layouts using structured UI components (stat cards, tables, badges, descriptions, embedded visualizations) instead of plain markdown. Also generate interactive in-chat forms for configuration, setup, and guided workflows (connectors, settings, filters). Use whenever the response involves multiple metrics, KPIs, structured information, or interactive user input.',
  content: `## When to Use This Skill

Use this skill when:
- The user asks for a summary, overview, dashboard-like layout, or structured data display that goes beyond plain text or a single chart.
- You need to compose multiple pieces of information (stats, descriptions, tables, badges, field values) into a cohesive visual layout.
- The response benefits from structured UI elements like stat cards, description lists, tables, or grouped panels rather than markdown.
- The user asks to "show me" or "display" information in a formatted way.
- The user wants to configure, set up, or create something (e.g., connectors, settings, alert rules) and an interactive form would be more helpful than plain-text instructions.
- The user asks for help with a multi-step workflow that involves collecting input (names, URLs, selections).

Do **not** use this skill when:
- The user only needs a single chart or visualization. Use the visualization-creation skill instead.
- A plain text or markdown response is sufficient and no structured layout or form would add value.
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

### Query Provenance for Downstream Reuse

When populating \`data_model\` from \`${platformCoreTools.executeEsql}\` or \`${platformCoreTools.generateEsql}\` results, include a \`_queries\` metadata key in the \`data_model\` that maps each data section to its source query and index:

\`\`\`json
{
  "data_model": {
    "total_orders": "4,675",
    "top_categories": [...],
    "_queries": {
      "summary_metrics": { "esql": "FROM kibana_sample_data_ecommerce | STATS ...", "index": "kibana_sample_data_ecommerce" },
      "top_categories": { "esql": "FROM kibana_sample_data_ecommerce | STATS ... BY category", "index": "kibana_sample_data_ecommerce" }
    }
  }
}
\`\`\`

This metadata enables downstream skills (dashboard-management, visualization-creation) to reuse the exact ES|QL queries rather than regenerating them from natural language, ensuring dashboards created from this summary match the displayed data.

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

### Form Components
- **TextInput**: Single-line input. Props: \`label\`, \`placeholder\`, \`field_id\`, \`default_value\`
- **TextArea**: Multi-line input. Props: \`label\`, \`placeholder\`, \`field_id\`, \`default_value\`, \`rows\`
- **Select**: Basic dropdown. Props: \`label\`, \`options\` [{value, label}], \`field_id\`, \`default_value\`. Best for short lists (under 8 options).
- **ComboBox**: Searchable single-select dropdown. Props: \`label\`, \`placeholder\`, \`options\` [{value, label}], \`field_id\`, \`default_value\`. **Preferred over Select when there are 8+ options** because users can type to filter. Do NOT use the \`icon\` option field for connectors — connector icons are custom SVGs and cannot be referenced by EUI icon names.
- **Switch**: Boolean toggle. Props: \`label\`, \`field_id\`, \`default_value\` (boolean)
- **FormGroup**: Groups form fields. Props: \`title\`, \`description\`, \`children\` (array of component ids)
- **StepsHeader**: Horizontal step indicator for multi-step workflows (display only, not navigational). Props: \`steps\` [{title, status?}]. Status values: \`incomplete\` (default), \`current\`, \`complete\`, \`loading\`, \`warning\`, \`danger\`, \`disabled\`. Place at the top of each form surface in a multi-step flow.

Each form field requires a \`field_id\` that identifies the field in the submission payload. Pair form fields with a Button that has \`action.event.name: "submit"\` to trigger form submission.

### Display Components
- **Progress**: Progress bar. Props: \`value\` (number), \`max\` (default 100), \`label\`, \`color\`
- **Timeline**: Ordered event timeline. Props: \`timeline_items\` [{title, description, icon, color}]
- **Callout**: Highlighted message box. Props: \`heading\`, \`text\`, \`color\` (primary|success|warning|danger|accent), \`icon_type\`, \`children\`
- **Accordion**: Collapsible section. Props: \`title\`, \`child\` or \`children\`, \`initially_open\` (boolean, default false)

### Interactive / Embedding Components
- **Button**: Clickable action. Props: \`text\`, \`action\` {event: {name, context}}, \`variant\` ("primary"|"default"), \`color\` (primary|success|warning|danger|accent|text). When clicked, gathers all form field values (by \`field_id\`) and sends them to the agent.
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

## Suggested Follow-Up Actions

After rendering an A2UI surface, include \`suggested_actions\` in the response to guide the user toward logical next steps. These render as clickable pill buttons below the response. Only include them when there is a clear, actionable follow-up.

### When to suggest

- **A2UI summary rendered** -> "Save as dashboard", "Show me last 7 days"
- **Host/service overview** -> "Investigate errors", "Set up alert rule"
- **Ecommerce/KPI surface** -> "Break down by region", "Compare to last month"
- **Alert overview** -> "Show critical alerts", "Create detection rule"

### How to suggest

Call the \`${platformCoreTools.suggestFollowUps}\` tool with an \`actions\` array:

\`\`\`json
{"actions": [
  {"label": "Save as dashboard", "prompt": "Save this summary as a new dashboard"},
  {"label": "Show last 7 days", "prompt": "Show the same metrics for the last 7 days", "icon": "calendar"}
]}
\`\`\`

Each action needs a \`label\` (button text) and \`prompt\` (message sent when clicked). Optionally add \`icon\` (EUI icon name) and \`color\` (primary, success, accent, warning, danger).

Actions can include a \`url\` field with a Kibana-relative path to open in a new tab. Use this when the resource already exists as a saved object in Kibana and you know its ID from a prior tool result:
- Saved dashboard: \`{"label": "Open dashboard", "prompt": "Open the dashboard", "url": "/app/dashboards#/view/<dashboardId>", "icon": "dashboardApp"}\`
- Discover: \`{"label": "Explore in Discover", "prompt": "Open Discover", "url": "/app/discover", "icon": "discoverApp"}\`
- Connector: \`{"label": "View connector", "prompt": "View the connector", "url": "/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/<connectorId>", "icon": "link"}\`

Only use \`url\` when the ID comes from a tool result in the current conversation. Do not guess IDs. Do not use \`url\` for in-memory attachments that have not been saved to Kibana yet.

Keep suggested actions to 2-3 per response. Use concise labels (2-5 words). The prompt should be a complete sentence that the agent can act on.

### Dashboard bridge

After creating an A2UI surface with data-driven components (Stat, Table, VisualizationRef), always suggest dashboard actions. The dashboard-management skill can compose the summary's metrics, tables, and charts into a Kibana dashboard. Example suggested actions:
- \`{"label": "Create new dashboard", "prompt": "Create a new dashboard that mirrors the metrics, tables, and charts from this summary", "icon": "dashboardApp"}\`
- \`{"label": "Add to existing dashboard", "prompt": "Add the metrics, tables, and charts from this summary to an existing dashboard", "icon": "plus"}\`

## Multi-Step and Adaptive Forms

When a user request is ambiguous or involves multiple options, **do not assume a single choice**. Instead, use a multi-step form pattern:

### Connector terminology in Agent Builder
When a user says "connector" in Agent Builder, they mean **spec-based Stack Connectors** — integrations with external services like Slack, Google Drive, Jira, GitHub, Salesforce, etc. These are NOT LLM connectors (OpenAI, Bedrock, Gemini) which power the agent's conversation. Default to showing spec-based connectors unless the user explicitly asks about LLM or AI model connectors.

### Step 1: Present options first
If the user says "set up a connector" or "configure something" without specifying which kind, render a **selection form** as the first step. Use a ComboBox (preferred for large option lists) or a set of Buttons to let the user pick.

### Step 2: Adapt based on selection
When the user submits the selection form (clicks the Button), the form data is sent back to you as a message. Use the selected value to render a **second form** with fields specific to that choice.

### When to use multi-step forms
- The user asks to create or configure something but hasn't specified which type.
- The available options have significantly different configuration fields.
- There are more than 3 distinct categories to choose from.

### No backward navigation
Do NOT include "Back", "Previous", or any backward-navigation buttons in multi-step A2UI forms. This is a chat-based interface where each step is a separate message in the conversation history. Users can scroll up to review or resubmit any previous step at any time, so backward navigation is redundant. Each form surface should only contain forward actions (e.g., "Next", "Submit", "Create").

### How it works
1. Render an A2UI surface with a ComboBox (or list of Buttons) for the top-level choice. Include a **StepsHeader** at the top to show the user where they are in the flow (e.g., Step 1 = current, Step 2 = incomplete).
2. Include a "Next" Button with \`action.event.name: "next"\` and \`action.event.context\` describing the step.
3. When the user clicks "Next", you receive a message containing their selection via \`field_id\` values.
4. Respond with a new A2UI surface containing the adapted form for their specific choice. Update the StepsHeader so Step 1 = complete and Step 2 = current.

This pattern also applies to guided workflows where each step depends on the previous answer (e.g., choosing a data source, then configuring its specific settings).

### Discovering available options
Before rendering a selection form, use available tools to discover what options exist:
- For **connectors**: Call \`platform.core.list_connector_specs\` to get the full catalog of available connectors. Then call \`platform.core.get_connector_schema\` with the selected connector type ID to get its exact configuration fields (JSON Schema with labels, help text, placeholders, and sensitivity flags). Use these fields to build an accurate A2UI form. After the user fills the form, call \`platform.core.create_connector\` to create the connector.
- For other options: Use \`platform.core.sml_search\` or other tools to find available options.
- **Always populate options dynamically from tool results rather than hardcoding.**

## Best Practices

- Keep surfaces focused: one surface per logical unit of information.
- Prefer Stat components for KPIs and metrics, DescriptionList for metadata, Table for tabular data.
- Use meaningful surface_id values (e.g. "host_overview", "alert_summary").
- Limit component tree depth to keep layouts readable (max 10 levels).
- When combining with visualizations, create the visualization first, then embed it via VisualizationRef.
- Apply color to Stats and Badges where the value has a clear healthy/degraded/critical interpretation. Do not color every component.
- **Icons:** Only use these validated EUI icon names: \`check\`, \`warning\`, \`iInCircle\`, \`bolt\`, \`link\`, \`gear\`, \`plus\`, \`arrowRight\`, \`cross\`, \`search\`, \`document\`, \`lock\`, \`user\`. Do NOT use \`logo*\` icons (e.g. \`logoSlack\`) — they often do not exist. Connector icons are resolved automatically in ComboBox by the connector ID in the \`value\` field; do not specify \`icon\` for connector options.
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

## Multi-Step Connector Setup (Tool-Driven)

In Agent Builder, "connector" refers to **spec-based Stack Connectors** that integrate with external services (Slack, Google Drive, Jira, GitHub, Notion, PagerDuty, Salesforce, etc.). These are NOT LLM connectors (OpenAI, Bedrock, Gemini) which power the agent's conversation and are configured separately.

This example shows a **three-step** connector creation flow driven by three tools:
1. \`platform.core.list_connector_specs\` — discover available connectors
2. \`platform.core.get_connector_schema\` — get exact config fields for the selected connector
3. \`platform.core.create_connector\` — create the connector with collected form data

### Step 1: Select connector type

First, call \`platform.core.list_connector_specs\` (no parameters). It returns all connectors with their IDs, display names, and descriptions. Use the results to populate a ComboBox. **Never hardcode connector lists.**

\`\`\`json
{
  "surface_id": "connector_setup_step1",
  "title": "Set Up a Connector",
  "components": [
    {"id": "root", "component": "Column", "children": ["progress", "intro", "form", "next_btn"]},
    {"id": "progress", "component": "StepsHeader", "steps": [
      {"title": "Select Service", "status": "current"},
      {"title": "Configure", "status": "incomplete"},
      {"title": "Review", "status": "incomplete"}
    ]},
    {"id": "intro", "component": "Text", "text": "Agent Builder connectors integrate with external services. Search for or select the service you'd like to connect.", "variant": "body"},
    {"id": "form", "component": "FormGroup", "title": "Choose a Service", "children": ["type_select"]},
    {"id": "type_select", "component": "ComboBox", "label": "Connector", "field_id": "connector_type", "placeholder": "Search connectors...", "options": "POPULATE_FROM_list_connector_specs_RESULTS"},
    {"id": "next_btn", "component": "Button", "text": "Next", "variant": "primary", "action": {"event": {"name": "next", "context": {"step": "select_type"}}}}
  ]
}
\`\`\`

Map each connector from the tool result to a ComboBox option: \`{"value": connector.id, "label": connector.displayName}\`. The UI automatically resolves the correct connector icon from the connector ID — you do NOT need to specify an \`icon\` field.

### Step 2: Type-specific configuration

When the user clicks "Next", you receive their selection (e.g. \`connector_type: ".google_drive"\`). Call \`platform.core.get_connector_schema\` with that ID. The response includes:
- \`configSchema\`: A JSON Schema for non-auth configuration fields (may be null or empty for connectors that only need auth credentials).
- \`authTypes\`: An array of auth type objects, each with \`id\` (e.g. \`"bearer"\`, \`"oauth_authorization_code"\`) and \`schema\` (JSON Schema with labels and sensitivity flags for auth-specific fields).

**Auth type handling is critical.** Many connectors support multiple auth types (e.g. Bearer token AND OAuth). The form MUST:
1. If there is only one auth type, render its fields directly.
2. If there are multiple auth types, render a **Select** for the user to pick their auth method, then use \`visible_when\` on each auth-type FormGroup so only the selected auth type's fields are displayed.
3. Auth type schemas contain a \`sensitive\` flag on fields that hold secrets. Map these to the \`secrets\` object when calling \`create_connector\`.

**Conditional visibility (\`visible_when\`):** Any component can include \`"visible_when": {"field": "<field_id>", "value": "<expected>"}\` to only render when the referenced Select/ComboBox/Switch field matches. \`value\` may also be an array of strings for multi-match. The controlling field must use a \`field_id\`, and the UI dynamically shows/hides sections when the user changes that field. Use this for auth-type-dependent form sections and any other conditional fields.

For each auth type schema property:
- Use the \`label\` as the TextInput label
- Use \`placeholder\` if available
- Fields with \`sensitive: true\` are secrets (tokens, client secrets, passwords)
- Fields with \`hidden: true\` should be omitted from the form (they have defaults)

For config schema properties (if present):
- Same mapping: \`label\` → TextInput label, \`placeholder\` → placeholder, \`helpText\` → description

Always include a "Connector Name" field (\`field_id: "connector_name"\`).

Example for Google Drive (which has bearer + OAuth auth types):

\`\`\`json
{
  "surface_id": "connector_setup_step2",
  "title": "Configure Google Drive Connector",
  "components": [
    {"id": "root", "component": "Column", "children": ["progress", "name_form", "auth_form", "submit_btn"]},
    {"id": "progress", "component": "StepsHeader", "steps": [
      {"title": "Select Service", "status": "complete"},
      {"title": "Configure", "status": "current"},
      {"title": "Review", "status": "incomplete"}
    ]},
    {"id": "name_form", "component": "FormGroup", "title": "Connector Settings", "children": ["name_input"]},
    {"id": "name_input", "component": "TextInput", "label": "Connector Name", "field_id": "connector_name", "placeholder": "e.g. My Google Drive"},
    {"id": "auth_form", "component": "FormGroup", "title": "Authentication", "description": "Choose how to authenticate with Google Drive.", "children": ["auth_select", "bearer_fields", "oauth_fields"]},
    {"id": "auth_select", "component": "Select", "label": "Auth Method", "field_id": "authType", "options": [{"value": "bearer", "label": "Bearer Token"}, {"value": "oauth_authorization_code", "label": "OAuth 2.0 Authorization Code"}], "default_value": "bearer"},
    {"id": "bearer_fields", "component": "FormGroup", "title": "Bearer Token", "children": ["token_input"], "visible_when": {"field": "authType", "value": "bearer"}},
    {"id": "token_input", "component": "TextInput", "label": "Token", "field_id": "token", "placeholder": ""},
    {"id": "oauth_fields", "component": "FormGroup", "title": "OAuth 2.0 Credentials", "children": ["client_id_input", "client_secret_input"], "visible_when": {"field": "authType", "value": "oauth_authorization_code"}},
    {"id": "client_id_input", "component": "TextInput", "label": "Client ID", "field_id": "clientId", "placeholder": ""},
    {"id": "client_secret_input", "component": "TextInput", "label": "Client Secret", "field_id": "clientSecret", "placeholder": ""},
    {"id": "submit_btn", "component": "Button", "text": "Create Connector", "variant": "primary", "color": "success", "action": {"event": {"name": "submit", "context": {"form": "create_connector"}}}}
  ]
}
\`\`\`

The \`visible_when\` property controls conditional rendering: the \`bearer_fields\` group only appears when authType is "bearer", and \`oauth_fields\` only when authType is "oauth_authorization_code". When the user changes the Select, the form dynamically shows/hides the matching fields.

### Step 3: Create the connector

When the user submits the form, you receive the form data. Based on the selected \`authType\`:
- Collect the auth-specific fields as \`secrets\` (fields marked \`sensitive: true\` in that auth type's schema)
- Collect non-auth config fields from \`configSchema\` as \`config\`
- For OAuth auth types, also include non-sensitive auth fields (like URLs) in \`config\` if they differ from defaults

Then call \`platform.core.create_connector\`:

\`\`\`
platform.core.create_connector({
  connector_type_id: ".google_drive",
  name: "My Google Drive",
  config: { authType: "oauth_authorization_code", authorizationUrl: "...", tokenUrl: "...", clientId: "..." },
  secrets: { clientSecret: "..." }
})
\`\`\`

Render a success Callout or error message based on the result.

**Key principles:**
- The agent reads real schemas and generates real forms from tool results. Never guess at connector fields, auth types, or configuration structure.
- Do NOT use EUI icon names for connectors (logoSlack, etc.) — connector icons are custom SVGs not available as EUI glyphs.
- When a Callout or other component needs an icon, use only valid EUI icon names like \`"check"\`, \`"warning"\`, \`"iInCircle"\`, \`"bolt"\`, \`"link"\`, \`"gear"\`, \`"plus"\`, \`"arrowRight"\`. Do not guess icon names.
`,
    },
  ],
  getRegistryTools: () => [
    platformCoreTools.createA2UISurface,
    platformCoreTools.suggestFollowUps,
    platformCoreTools.search,
    platformCoreTools.executeEsql,
    platformCoreTools.createVisualization,
    platformCoreTools.listConnectorSpecs,
    platformCoreTools.getConnectorSchema,
    platformCoreTools.createConnector,
  ],
});

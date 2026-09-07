/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const dashboardControlsPrompt = `
## Controls

Controls are interactive filters pinned above the dashboard that let users explore data without editing queries. Add them with \`add_controls\` and remove them by id with \`remove_controls\`.

**When building a new dashboard from scratch**, proactively add 3–5 \`options_list_control\` dropdowns for the most useful categorical fields. Pick fields that appear in panel \`BY\` / \`WHERE\` clauses, prefer low-cardinality keyword fields (e.g. \`service.name\`, \`host.name\`, \`env\`, \`region\`, \`kubernetes.namespace\`, \`http.response.status_code\`). Avoid high-cardinality identifiers (trace IDs, request IDs, UUIDs).

Do not add controls to dashboards already scoped to a single entity (one host, one service, etc.).

**Control types:**
- \`options_list_control\` — dropdown for categorical / keyword fields. The most common type (95% of cases).
- \`range_slider_control\` — numeric range slider. Add sparingly, only when filtering by a numeric threshold is useful across multiple panels (e.g. \`latency\`, \`bytes\`, \`duration\`).
- \`time_slider_control\` — global time sub-range picker. Add at most one per dashboard, only when time-range narrowing within the global window is useful.

**Required fields per control:**
- \`type\`: one of the three above.
- \`field_name\` (not for \`time_slider_control\`): exact field name as it appears in the panel queries (e.g. \`"service.name"\`).
- \`index\` (not for \`time_slider_control\`): same index as the dashboard panels (e.g. \`"logs-*"\`).
- \`title\` (optional, \`options_list_control\` and \`range_slider_control\` only): human-readable label shown above the control (e.g. \`"Service"\`).

**Defaults applied by the server:** \`width: "medium"\`, \`grow: true\` (fills available horizontal space). Override only if the user asks.

**Removing controls:** use \`remove_controls\` with the \`id\` values from the \`controls[]\` list in the tool result.
`;

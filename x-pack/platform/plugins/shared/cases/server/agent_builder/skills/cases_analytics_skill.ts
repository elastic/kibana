/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';

/**
 * Analytics/reporting skill for Elastic Cases. Distinct from the
 * `cases-management` skill (per-case CRUD via the Cases API): this skill runs
 * ES|QL over the three cluster-level analytics indices — `.cases`,
 * `.cases-activity`, `.cases-attachments` — and builds visualizations /
 * dashboards from the results.
 *
 * Registered only when `xpack.cases.analyticsV2.enabled` is true (the indices
 * don't exist otherwise). All queries run as the requesting user, so
 * Elasticsearch implicit-privileges DLS scopes results to the owners + spaces
 * the user can already read.
 */
export const casesAnalyticsSkill = defineSkillType({
  id: 'cases-analytics',
  name: 'cases-analytics',
  basePath: 'skills/platform/cases',
  description:
    'Analyze and report on Elastic Cases at scale: case volume and trends, closure rates, MTTR/SLA timings, time-in-status, assignee workload, alert/observable breakdowns, and custom-field analytics — answered with ES|QL over the case analytics indices, and rendered as visualizations or dashboards. Use for aggregate/reporting/metric/dashboard questions about cases (not single-case create/read/update — that is the cases-management skill).',

  content: `# Cases Analytics

Answer aggregate, trend, and reporting questions about Elastic Cases, and build visualizations/dashboards, using ES|QL over three cluster-level analytics indices populated from the case saved objects.

## When to use this skill

Use it for **aggregate / reporting / metric / dashboard** questions about cases:
- Volume, trends, closure rate, backlog, open-vs-closed over time.
- SLA / MTTR / MTTA and time-in-status.
- Assignee or team workload, tag/category breakdowns.
- Alert-source and observable/IOC breakdowns across cases.
- Custom-field (extended field) analytics.
- "Build me a dashboard / chart of ..." for case data.

Do **not** use it for single-case operations — creating, reading, updating, commenting, assigning, or fetching one case's details. Route those to the **cases-management** skill (\`${platformCoreTools.cases}\` and the write tools).

## Indices & join model

| Index | Grain | Key fields |
|-------|-------|-----------|
| \`.cases\` | one doc per case (lookup-mode) | \`cases.id\`, \`cases.status\`, \`cases.severity\`, \`cases.owner\`, \`cases.created_at\`, \`cases.closed_at\`, \`cases.in_progress_at\`, \`cases.time_to_acknowledge\`, \`cases.time_to_investigate\`, \`cases.time_to_resolve\`, \`cases.duration\`, \`cases.total_alerts\`, \`cases.total_comments\`, \`cases.tags\`, \`cases.category\`, \`cases.assignees.uid\`, \`cases.observables.<type>\`, \`cases.extended_fields\` |
| \`.cases-activity\` | one doc per user action | \`cases.id\`, \`action.type\`, \`action.verb\`, \`action.status_new\`, \`action.severity_new\`, \`action.assignees_changed\`, \`action.tags_changed\`, \`action.connector_id_new\`, \`action.attachment_reference_id\`, \`actor.*\`, \`@timestamp\` |
| \`.cases-attachments\` | one doc per comment/attachment | \`cases.id\`, \`attachment.type\`, \`attachment.comment\`, \`attachment.alert.rule.id\`, \`attachment.alert.rule.name\`, \`attachment.alert.indices\`, \`attachment.event.indices\`, \`attachment.attachment_id\`, \`created_at\` |

All three carry \`cases.id\`, \`owner\`, and \`space_id\`. \`.cases\` is lookup-mode, so the fact indices enrich with current case fields via:

\`\`\`esql
FROM .cases-activity | LOOKUP JOIN .cases ON cases.id | KEEP @timestamp, cases.id, cases.status, cases.severity
\`\`\`

Always \`KEEP\` the concrete columns you need after a \`LOOKUP JOIN\` — don't let the raw \`cases.extended_fields\` (flattened) column flow through a joined result; read custom fields with \`FIELD_EXTRACT\` instead (see "Custom fields").

Status values: \`open\`, \`in-progress\`, \`closed\`. Severity: \`low\`, \`medium\`, \`high\`, \`critical\` (stored as readable strings, not enums).

## Boundaries & authorization

- The user defines the scope. Filter by \`owner\` (\`securitySolution\`, \`observability\`, \`cases\`) and/or \`space_id\` **only when the user asks to narrow to a solution or space** — do not force a solution choice, and do not restrict scope on your own.
- Results are already scoped by Elasticsearch: queries run as the user, and document-level security limits them to the owners + spaces the user can read. So an **empty result may mean "not authorized," not "no data"** — say so rather than asserting there are no cases.

## Freshness & verification (trust, but verify)

These indices are **re-indexed from the case saved objects** by real-time hooks plus a periodic reconciliation backstop, so they are **eventually consistent** and can occasionally drift. When:
- a figure looks anomalous or internally inconsistent,
- the user questions a number's accuracy, or
- the question is freshness-sensitive (very recent cases or edits),

cross-check against the source of truth with \`${platformCoreTools.cases}\` (get / bulk_get / search) and reconcile. Prefer the saved-object value when they disagree, and tell the user there may be indexing lag. Never present a suspicious analytics number as fact without this check.

## KQL / the Case Analytics data view (self-service + fallback)

A managed, per-space **\`Case Analytics\` data view** spans all three indices and publishes each custom field as a typed top-level runtime field \`cases.<name>_as_<type>\` (e.g. \`cases.effort_as_integer\`). Use it:

- **Hand off for self-service** when a user prefers Discover/Lens with KQL — author the KQL for them and name the fields, e.g. \`cases.status: "open" and cases.effort_as_integer > 3\`.
- **As the custom-field fallback** when \`FIELD_EXTRACT\` returns nothing or you need guaranteed typed results (the runtime field reads the same flattened values via doc-values).

Boundary: your ES|QL tools (\`${platformCoreTools.generateEsql}\`, \`${platformCoreTools.executeEsql}\`, \`${platformCoreTools.createVisualization}\`) query the indices directly and do NOT read the data view's runtime fields — so custom-field analytics in ES|QL goes through \`FIELD_EXTRACT\` (see "Custom fields"), and the \`Case Analytics\` data view is the self-service / fallback surface.

## Custom fields (extended / template fields)

Custom fields are exposed two ways on \`.cases\` — **always use \`cases.extended_fields\`, never \`cases.customFields\`, for analytics:**
- \`cases.customFields\` — a **nested** array of \`{ key, type, value }\`. It is **not directly queryable in ES|QL**; don't try to aggregate it (that path dead-ends — don't waste turns on it).
- \`cases.extended_fields\` — a **flattened** field keyed as \`<name>_as_<type>\` (e.g. \`effort_as_integer\`, \`summary_as_keyword\`, \`reviewedAt_as_date\`). This is the queryable, typed path — always prefer it. (The suffix is the template field type; the value is stored as a string in the flattened field.)

Extract with \`FIELD_EXTRACT\`, cast to the type you need, then aggregate:

\`\`\`esql
FROM .cases
| WHERE cases.status != "closed"
| EVAL effort = FIELD_EXTRACT(cases.extended_fields, "effort_as_integer")
| STATS avg_effort = AVG(effort::double), with_value = COUNT(effort), total = COUNT(*)
\`\`\`

\`FIELD_EXTRACT\` is a **Technical Preview** function. It reads numeric and keyword sub-keys from the flattened \`cases.extended_fields\`, but blank/unset custom fields are common, so **always report how many docs had the field populated** (\`COUNT(<extracted>)\`) alongside the metric. When precision matters or FIELD_EXTRACT returns nothing, fall back to the \`Case Analytics\` data view (see "KQL / the Case Analytics data view"), whose typed runtime field \`cases.<name>_as_<type>\` reads the same values.

## Building visualizations

Use \`${platformCoreTools.createVisualization}\`. Ground first (confirm the index and that referenced fields exist — use \`${platformCoreTools.getIndexMapping}\` if unsure), then pass an explicit \`index\` (\`.cases\`, \`.cases-activity\`, or \`.cases-attachments\`) so it doesn't have to auto-discover. Prefer letting it generate the ES|QL from a specific natural-language \`query\`; for complex aggregations/joins, pre-build with \`${platformCoreTools.generateEsql}\`, optionally validate with \`${platformCoreTools.executeEsql}\`, and pass it via \`esql\`. Render the returned attachment with \`<render_attachment id="..." version="..." />\`.

## Building dashboards

To assemble multiple panels into a dashboard, use the **dashboard-management** skill: create the case panels (as above), then hand off to its dashboard tool to lay them out. Ground the index once and reuse it across panels. The result is an inline dashboard the user can view and, if they choose, save to a real Kibana dashboard from the UI.

## Query hygiene

- Always time-bound trend queries (e.g. \`WHERE cases.created_at >= NOW() - 30 days\`).
- \`STATS ... BY\` before returning raw rows; use \`LIMIT\` to keep output bounded.
- SLA/timing fields (\`cases.time_to_*\`, \`cases.duration\`) are numeric — aggregate with \`AVG\`/\`MEDIAN\`/percentiles; convert units in the answer.
- See the referenced query templates for ready-made patterns.
`,

  referencedContent: [
    {
      relativePath: './analytics',
      name: 'kpi-queries',
      content: `# Core KPI queries

## Case volume by severity (last 30 days)
\`\`\`esql
FROM .cases
| WHERE cases.created_at >= NOW() - 30 days
| STATS cases = COUNT(*) BY cases.severity
| SORT cases DESC
\`\`\`

## Open cases opened per week (trend, last 90 days)
\`\`\`esql
FROM .cases
| WHERE cases.created_at >= NOW() - 90 days
| STATS opened = COUNT(*) BY week = BUCKET(cases.created_at, 1 week)
| SORT week ASC
\`\`\`

## Closure rate by solution
\`\`\`esql
FROM .cases
| EVAL is_closed = CASE(cases.status == "closed", 1, 0)
| STATS total = COUNT(*), closed = SUM(is_closed) BY cases.owner
| EVAL closure_rate = ROUND(closed::double / total, 3)
| SORT total DESC
\`\`\`

## MTTR (mean time to resolve) by severity
\`\`\`esql
FROM .cases
| WHERE cases.status == "closed" AND cases.time_to_resolve IS NOT NULL
| STATS mttr_ms = AVG(cases.time_to_resolve), p90_ms = PERCENTILE(cases.time_to_resolve, 90) BY cases.severity
| SORT mttr_ms DESC
\`\`\`

## Open backlog by assignee
\`\`\`esql
FROM .cases
| WHERE cases.status != "closed"
| MV_EXPAND cases.assignees.uid
| STATS open_cases = COUNT(*) BY cases.assignees.uid
| SORT open_cases DESC
\`\`\`
Note: \`cases.assignees.uid\` is a profile UID, and **no tool resolves it to a display name today** — the cases tools return assignees as UIDs. Present the UID and say the name isn't available rather than guessing. (The \`cases.created_by\` / \`updated_by\` / \`closed_by\` fields, by contrast, do carry \`username\` / \`full_name\` / \`email\`.)`,
    },
    {
      relativePath: './analytics',
      name: 'activity-and-sla',
      content: `# Activity-stream & time-in-status queries

The \`.cases-activity\` stream is append-only (one row per user action). Time-in-status and transition metrics are reconstructed from ordered \`action.status_new\` events.

## Status transitions for a case, in order
\`\`\`esql
FROM .cases-activity
| WHERE action.type == "status" AND cases.id == "<CASE_ID>"
| KEEP @timestamp, action.status_new
| SORT @timestamp ASC
\`\`\`
Compute time-in-status by differencing consecutive \`@timestamp\` values (successive rows are the enter-times of each status). "Time to escalate" at the case level is available directly on \`.cases\` as \`cases.in_progress_at - cases.created_at\`; "time to resolve" as \`cases.time_to_resolve\`.

## Most active cases (last 7 days), enriched with current case fields
\`\`\`esql
FROM .cases-activity
| WHERE @timestamp >= NOW() - 7 days
| STATS actions = COUNT(*) BY cases.id
| SORT actions DESC
| LIMIT 20
| LOOKUP JOIN .cases ON cases.id
| KEEP cases.id, cases.title, cases.status, cases.severity, actions
\`\`\`

## Connector adoption (pushes by connector)
\`\`\`esql
FROM .cases-activity
| WHERE action.type == "connector" AND action.connector_id_new IS NOT NULL
| STATS cases = COUNT_DISTINCT(cases.id) BY action.connector_id_new
| SORT cases DESC
\`\`\``,
    },
    {
      relativePath: './analytics',
      name: 'attachments-and-alerts',
      content: `# Attachment & alert queries

## Cases by originating detection rule
\`\`\`esql
FROM .cases-attachments
| WHERE attachment.alert.rule.name IS NOT NULL
| STATS cases = COUNT_DISTINCT(cases.id) BY attachment.alert.rule.name
| SORT cases DESC
\`\`\`

## Alert-attachment count per case (top 20)
\`\`\`esql
FROM .cases-attachments
| WHERE attachment.alert.indices IS NOT NULL
| STATS alert_attachments = COUNT(*) BY cases.id
| SORT alert_attachments DESC
| LIMIT 20
\`\`\`
Filter on the presence of \`attachment.alert.*\` (populated only for alert subtypes) rather than a literal \`attachment.type\` string — the unified type value is owner-scoped and varies.

## Observable (IOC) frequency across cases — e.g. IPv4
\`\`\`esql
FROM .cases
| MV_EXPAND cases.observables.ipv4
| WHERE cases.observables.ipv4 IS NOT NULL
| STATS occurrences = COUNT(*) BY cases.observables.ipv4
| SORT occurrences DESC
\`\`\`
Swap \`ipv4\` for the observable type of interest (e.g. \`url\`, \`domain\`, \`file-hash\`).

## MTTD note
The alert's original detection time is not stored on the attachment (only rule id/name and source indices). To compute MTTD, join out to the alerts indices in \`attachment.alert.indices\` using the alert ids in \`attachment.attachment_id\`, then compare the alert's original time to \`cases.created_at\`.`,
    },
    {
      relativePath: './analytics',
      name: 'custom-fields',
      content: `# Custom-field (extended field) queries

Custom fields live in the **flattened** \`cases.extended_fields\`, keyed \`<name>_as_<type>\`. Use \`FIELD_EXTRACT\` (Technical Preview) and cast. Do NOT use the nested \`cases.customFields\` — it isn't queryable in ES|QL.

## Average of a numeric custom field, open cases
\`\`\`esql
FROM .cases
| WHERE cases.status != "closed"
| EVAL effort = FIELD_EXTRACT(cases.extended_fields, "effort_as_integer")
| STATS avg_effort = AVG(effort::double), with_value = COUNT(effort), total = COUNT(*)
\`\`\`

## Breakdown by a keyword custom field
\`\`\`esql
FROM .cases
| EVAL component = FIELD_EXTRACT(cases.extended_fields, "affected_components_as_keyword")
| WHERE component IS NOT NULL
| STATS cases = COUNT(*) BY component
| SORT cases DESC
\`\`\`

Always surface populated-vs-total counts — blank custom fields are common and FIELD_EXTRACT is Technical Preview. For guaranteed typed results or self-service exploration, use the \`Case Analytics\` data view's \`cases.<name>_as_<type>\` runtime fields in Discover / Lens.`,
    },
  ],

  getRegistryTools: () => [
    platformCoreTools.generateEsql,
    platformCoreTools.executeEsql,
    platformCoreTools.search,
    platformCoreTools.listIndices,
    platformCoreTools.getIndexMapping,
    platformCoreTools.createVisualization,
    // Source-of-truth verification + drill-down to individual cases.
    platformCoreTools.cases,
  ],
});

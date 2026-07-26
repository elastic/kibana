/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';

/**
 * Aggregate analytics and reporting for Elastic Cases: runs ES|QL over the
 * three cluster-level analytics indices (`.cases`, `.cases-activity`,
 * `.cases-attachments`) and builds visualizations / dashboards from the
 * results. Read-only and aggregate — the sibling `cases-management` skill
 * covers reading and writing individual cases.
 *
 * Registered only when `xpack.cases.analyticsV2.enabled` is true (the indices
 * don't exist otherwise). All queries run as the requesting user, so
 * Elasticsearch implicit-privileges DLS scopes results to the owners + spaces
 * the user can already read.
 *
 * NOTE ON FIELD PATHS: the index is named `.cases` (plural), but its document
 * fields live under the singular `case.*` object namespace (see
 * `mappings/case.ts` / `writer/case_doc_builder.ts`). The mapping is
 * `dynamic: 'strict'`, so recipes must use `case.<field>` (e.g. `case.id`,
 * `case.status`) — not `cases.<field>`.
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

## Field paths: index \`.cases\`, fields \`case.*\`

The indices are named \`.cases\` / \`.cases-activity\` / \`.cases-attachments\` (plural), but document fields live under the **singular** \`case.*\` namespace, and the mapping is \`dynamic: 'strict'\`. Always write \`case.<field>\` (e.g. \`case.id\`, \`case.status\`) — a \`cases.<field>\` path references an undefined column and the query fails. Keep the plural form only for index names (\`FROM .cases\`), the tool id (\`${platformCoreTools.cases}\`), and the config key.

## Indices & join model

| Index | Grain | Key fields |
|-------|-------|-----------|
| \`.cases\` | one doc per case (lookup-mode) | \`case.id\`, \`case.status\`, \`case.severity\`, \`case.owner\`, \`case.created_at\`, \`case.closed_at\`, \`case.in_progress_at\`, \`case.time_to_acknowledge\`, \`case.time_to_investigate\`, \`case.time_to_resolve\`, \`case.duration\`, \`case.total_alerts\`, \`case.total_comments\`, \`case.tags\`, \`case.category\`, \`case.assignees.uid\`, \`case.observables.observable-type-<x>\`, \`case.extended_fields\` |
| \`.cases-activity\` | one doc per user action | \`case.id\`, \`action.type\`, \`action.verb\`, \`action.status_new\`, \`action.severity_new\`, \`action.assignees_changed\`, \`action.tags_changed\`, \`action.connector_id_new\`, \`action.attachment_reference_id\`, \`actor.*\`, \`@timestamp\` |
| \`.cases-attachments\` | one doc per comment/attachment | \`case.id\`, \`attachment.type\`, \`attachment.comment\`, \`attachment.alert.rule.id\`, \`attachment.alert.rule.name\`, \`attachment.alert.indices\`, \`attachment.event.indices\`, \`attachment.attachment_id\`, \`created_at\` |

All three carry \`case.id\`, \`owner\`, and \`space_id\`. \`.cases\` is lookup-mode, so the fact indices enrich with current case fields via:

\`\`\`esql
FROM .cases-activity | LOOKUP JOIN .cases ON case.id | KEEP @timestamp, case.id, case.status, case.severity
\`\`\`

Always \`KEEP\` the concrete columns you need after a \`LOOKUP JOIN\` — don't let the raw \`case.extended_fields\` (flattened) column flow through a joined result; read custom fields with \`FIELD_EXTRACT\` instead (see "Custom fields").

Status values: \`open\`, \`in-progress\`, \`closed\`. Severity: \`low\`, \`medium\`, \`high\`, \`critical\` (stored as readable strings, not enums).

**Field units.** \`case.duration\`, \`case.time_to_acknowledge\`, \`case.time_to_investigate\`, \`case.time_to_resolve\` are integer **seconds** (NOT milliseconds), and are \`null\` until the case reaches the relevant state (in-progress / closed). Convert for humans in the answer — \`/ 3600\` for hours, \`/ 86400\` for days — and always label the unit. Timestamps (\`case.created_at\`, \`case.closed_at\`, \`case.in_progress_at\`, \`@timestamp\`) are dates; \`case.total_alerts\` / \`total_comments\` / \`total_events\` / \`total_observables\` are integer counts.

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

A managed, per-space **\`Case Analytics\` data view** spans all three indices and publishes each custom field as a typed top-level runtime field \`case.<name>_as_<type>\` (e.g. \`case.effort_as_integer\`). Use it:

- **Hand off for self-service** when a user prefers Discover/Lens with KQL — author the KQL for them and name the fields, e.g. \`case.status: "open" and case.effort_as_integer > 3\`.
- **As the custom-field fallback** when \`FIELD_EXTRACT\` returns nothing or you need guaranteed typed results (the runtime field reads the same flattened values via doc-values).

Boundary: your ES|QL tools (\`${platformCoreTools.generateEsql}\`, \`${platformCoreTools.executeEsql}\`, \`${platformCoreTools.createVisualization}\`) query the indices directly and do NOT read the data view's runtime fields — so custom-field analytics in ES|QL goes through \`FIELD_EXTRACT\` (see "Custom fields"), and the \`Case Analytics\` data view is the self-service / fallback surface.

## Custom fields (extended / template fields)

Custom fields are exposed two ways on \`.cases\` — **always use \`case.extended_fields\`, never \`case.customFields\`, for analytics:**
- \`case.customFields\` — a **nested** array of \`{ key, type, value }\`. It is **not directly queryable in ES|QL**; don't try to aggregate it (that path dead-ends — don't waste turns on it).
- \`case.extended_fields\` — a **flattened** field keyed as \`<name>_as_<type>\` (e.g. \`effort_as_integer\`, \`summary_as_keyword\`, \`reviewedAt_as_date\`). This is the queryable, typed path — always prefer it. (The suffix is the template field type; the value is stored as a string in the flattened field.)

Extract with \`FIELD_EXTRACT\`, cast to the type you need, then aggregate:

\`\`\`esql
FROM .cases
| WHERE case.status != "closed"
| EVAL effort = FIELD_EXTRACT(case.extended_fields, "effort_as_integer")
| STATS avg_effort = AVG(effort::double), with_value = COUNT(effort), total = COUNT(*)
\`\`\`

\`FIELD_EXTRACT\` is a **Technical Preview** function. It reads numeric and keyword sub-keys from the flattened \`case.extended_fields\`, but blank/unset custom fields are common, so **always report how many docs had the field populated** (\`COUNT(<extracted>)\`) alongside the metric. When precision matters or FIELD_EXTRACT returns nothing, fall back to the \`Case Analytics\` data view (see "KQL / the Case Analytics data view"), whose typed runtime field \`case.<name>_as_<type>\` reads the same values.

## Resolving user UIDs to names

Assignees are stored as **profile UIDs only** — \`case.assignees.uid\` (and \`action.assignees_changed\` on the activity stream). No tool resolves them and there is no user directory index to join. But every \`.cases-activity\` row carries the **acting** user's identity (\`actor.profile_uid\` + \`actor.full_name\` + \`actor.username\`), so you can build a best-effort UID→name directory from the activity stream and use it to label UIDs:

\`\`\`esql
FROM .cases-activity
| WHERE actor.profile_uid IS NOT NULL
| STATS latest = MAX(@timestamp) BY actor.profile_uid, actor.full_name, actor.username
| SORT latest DESC
| RENAME actor.profile_uid AS uid
| KEEP uid, actor.full_name, actor.username
\`\`\`

Run this as a helper query, then map the UIDs in your result (e.g. \`case.assignees.uid\`) to names. Key points:
- **Best-effort coverage** — the directory only knows users who have *performed* a case action. A user who was assigned but never acted won't appear; show their UID and say the display name isn't available rather than guessing.
- **Renamed users** — a user whose name/username changed may appear on more than one row; the most recent (top, by \`latest\`) is current.
- **DLS-scoped** — you only see actors in the owners/spaces you can read, so the directory is naturally limited to authorized names.
- **Not a \`LOOKUP JOIN\`** — \`.cases-activity\` is a fact index (not lookup-mode), so it can't be a join target. Build the directory table first, then annotate in a second step.
- **Reporters need no resolution** — \`case.created_by\` / \`case.updated_by\` / \`case.closed_by\` already carry \`username\` / \`full_name\` / \`email\`.

For a dashboard (where the two-step annotate isn't available), surface the same directory query as its own table/Lens panel so it acts as a UID→name key alongside the UID-keyed charts.

## Building visualizations

Use \`${platformCoreTools.createVisualization}\`. Ground first (confirm the index and that referenced fields exist — use \`${platformCoreTools.getIndexMapping}\` if unsure), then pass an explicit \`index\` (\`.cases\`, \`.cases-activity\`, or \`.cases-attachments\`) so it doesn't have to auto-discover. Prefer letting it generate the ES|QL from a specific natural-language \`query\`; for complex aggregations/joins, pre-build with \`${platformCoreTools.generateEsql}\`, optionally validate with \`${platformCoreTools.executeEsql}\`, and pass it via \`esql\`. Render the returned attachment with \`<render_attachment id="..." version="..." />\`.

## Building dashboards

To assemble multiple panels into a dashboard, use the **dashboard-management** skill: create the case panels (as above), then hand off to its dashboard tool to lay them out. Ground the index once and reuse it across panels. The result is an inline dashboard the user can view and, if they choose, save to a real Kibana dashboard from the UI.

## Query hygiene

- Always time-bound trend queries (e.g. \`WHERE case.created_at >= NOW() - 30 days\`).
- \`STATS ... BY\` before returning raw rows; use \`LIMIT\` to keep output bounded.
- SLA/timing fields (\`case.time_to_*\`, \`case.duration\`) are integer **seconds** — aggregate with \`AVG\`/\`MEDIAN\`/percentiles, then convert in the answer (\`/ 3600\` hours, \`/ 86400\` days) and label the unit. Never report them as milliseconds.
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
| WHERE case.created_at >= NOW() - 30 days
| STATS case_count = COUNT(*) BY case.severity
| SORT case_count DESC
\`\`\`

## Open cases opened per week (trend, last 90 days)
\`\`\`esql
FROM .cases
| WHERE case.created_at >= NOW() - 90 days
| STATS opened = COUNT(*) BY week = BUCKET(case.created_at, 1 week)
| SORT week ASC
\`\`\`

## Closure rate by solution
\`\`\`esql
FROM .cases
| EVAL is_closed = CASE(case.status == "closed", 1, 0)
| STATS total = COUNT(*), closed = SUM(is_closed) BY case.owner
| EVAL closure_rate = ROUND(closed::double / total, 3)
| SORT total DESC
\`\`\`

## MTTR (mean time to resolve) by severity
\`\`\`esql
FROM .cases
| WHERE case.status == "closed" AND case.time_to_resolve IS NOT NULL
| STATS mttr_seconds = AVG(case.time_to_resolve), p90_seconds = PERCENTILE(case.time_to_resolve, 90) BY case.severity
| EVAL mttr_hours = ROUND(mttr_seconds / 3600, 1)
| SORT mttr_seconds DESC
\`\`\`
\`case.time_to_resolve\` (like \`case.time_to_acknowledge\` / \`case.time_to_investigate\` / \`case.duration\`) is in **seconds** — the \`EVAL\` converts MTTR to hours for readability.

## Open backlog by assignee
\`\`\`esql
FROM .cases
| WHERE case.status != "closed"
| MV_EXPAND case.assignees.uid
| STATS open_cases = COUNT(*) BY case.assignees.uid
| SORT open_cases DESC
\`\`\`
Note: \`case.assignees.uid\` is a profile UID. Label it with the activity-derived UID→name directory (helper below) — best-effort, covering users who've performed an action; otherwise show the UID. Reporters (\`case.created_by\` / \`case.updated_by\` / \`case.closed_by\`) already carry \`username\` / \`full_name\` / \`email\`.

## User UID → name directory (helper for labeling assignee UIDs)
\`\`\`esql
FROM .cases-activity
| WHERE actor.profile_uid IS NOT NULL
| STATS latest = MAX(@timestamp) BY actor.profile_uid, actor.full_name, actor.username
| SORT latest DESC
| RENAME actor.profile_uid AS uid
| KEEP uid, actor.full_name, actor.username
\`\`\`
Best-effort: only users who have performed an action appear. Use it to label \`case.assignees.uid\` / \`action.assignees_changed\`; fall back to the UID when absent (a renamed user's most recent row, by \`latest\`, is current). \`.cases-activity\` is a fact index, so this is a build-then-annotate step, not a \`LOOKUP JOIN\`.`,
    },
    {
      relativePath: './analytics',
      name: 'activity-and-sla',
      content: `# Activity-stream & time-in-status queries

The \`.cases-activity\` stream is append-only (one row per user action). Time-in-status and transition metrics are reconstructed from ordered \`action.status_new\` events.

## Status transitions for a case, in order
\`\`\`esql
FROM .cases-activity
| WHERE action.type == "status" AND case.id == "<CASE_ID>"
| KEEP @timestamp, action.status_new
| SORT @timestamp ASC
\`\`\`
Compute time-in-status by differencing consecutive \`@timestamp\` values (successive rows are the enter-times of each status). "Time to escalate" at the case level is available directly on \`.cases\` as \`case.in_progress_at - case.created_at\`; "time to resolve" as \`case.time_to_resolve\`.

## Most active cases (last 7 days), enriched with current case fields
\`\`\`esql
FROM .cases-activity
| WHERE @timestamp >= NOW() - 7 days
| STATS actions = COUNT(*) BY case.id
| SORT actions DESC
| LIMIT 20
| LOOKUP JOIN .cases ON case.id
| KEEP case.id, case.title, case.status, case.severity, actions
\`\`\`

## Connector adoption (distinct cases per connector)
\`\`\`esql
FROM .cases-activity
| WHERE action.type == "connector" AND action.connector_id_new IS NOT NULL
| STATS case_count = COUNT_DISTINCT(case.id) BY action.connector_id_new
| SORT case_count DESC
\`\`\`
This counts cases that had a connector **assigned** (\`action.type == "connector"\`) — i.e. connector usage, not push volume. Actual pushes to the external service are a separate user action (\`action.type == "pushed"\`) and do not populate \`action.connector_id_new\`.`,
    },
    {
      relativePath: './analytics',
      name: 'attachments-and-alerts',
      content: `# Attachment & alert queries

## Cases by originating detection rule
\`\`\`esql
FROM .cases-attachments
| WHERE attachment.alert.rule.name IS NOT NULL
| STATS case_count = COUNT_DISTINCT(case.id) BY attachment.alert.rule.name
| SORT case_count DESC
\`\`\`

## Alert-attachment count per case (top 20)
\`\`\`esql
FROM .cases-attachments
| WHERE attachment.alert.indices IS NOT NULL
| STATS alert_attachments = COUNT(*) BY case.id
| SORT alert_attachments DESC
| LIMIT 20
\`\`\`
Filter on the presence of \`attachment.alert.*\` (populated only for alert subtypes) rather than a literal \`attachment.type\` string — the unified type value is owner-scoped and varies.

## Observable (IOC) frequency across cases — e.g. IPv4
Observables are denormalized to one keyword array per type, keyed by the observable **type key** — \`observable-type-ipv4\`, \`observable-type-url\`, \`observable-type-domain\`, \`observable-type-file-hash\`, \`observable-type-hostname\`, \`observable-type-email\`, \`observable-type-ipv6\` (plus any custom types a tenant defines). The hyphens are not valid bare identifiers, so **backtick-quote the whole path** in ES|QL, as below:
\`\`\`esql
FROM .cases
| MV_EXPAND \`case.observables.observable-type-ipv4\`
| WHERE \`case.observables.observable-type-ipv4\` IS NOT NULL
| STATS occurrences = COUNT(*) BY \`case.observables.observable-type-ipv4\`
| SORT occurrences DESC
\`\`\`
Swap \`observable-type-ipv4\` for the type of interest. The set is open (custom observable types are allowed), so confirm which \`case.observables.*\` keys actually exist with \`${platformCoreTools.getIndexMapping}\` before relying on one.

## MTTD note
The alert's original detection time is not stored on the attachment (only rule id/name and source indices). To compute MTTD, join out to the alerts indices in \`attachment.alert.indices\` using the alert ids in \`attachment.attachment_id\`, then compare the alert's original time to \`case.created_at\`.`,
    },
    {
      relativePath: './analytics',
      name: 'custom-fields',
      content: `# Custom-field (extended field) queries

Custom fields live in the **flattened** \`case.extended_fields\`, keyed \`<name>_as_<type>\`. Use \`FIELD_EXTRACT\` (Technical Preview) and cast. Do NOT use the nested \`case.customFields\` — it isn't queryable in ES|QL.

## Average of a numeric custom field, open cases
\`\`\`esql
FROM .cases
| WHERE case.status != "closed"
| EVAL effort = FIELD_EXTRACT(case.extended_fields, "effort_as_integer")
| STATS avg_effort = AVG(effort::double), with_value = COUNT(effort), total = COUNT(*)
\`\`\`

## Breakdown by a keyword custom field
\`\`\`esql
FROM .cases
| EVAL component = FIELD_EXTRACT(case.extended_fields, "affected_components_as_keyword")
| WHERE component IS NOT NULL
| STATS case_count = COUNT(*) BY component
| SORT case_count DESC
\`\`\`

Always surface populated-vs-total counts — blank custom fields are common and FIELD_EXTRACT is Technical Preview. For guaranteed typed results or self-service exploration, use the \`Case Analytics\` data view's \`case.<name>_as_<type>\` runtime fields in Discover / Lens.`,
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

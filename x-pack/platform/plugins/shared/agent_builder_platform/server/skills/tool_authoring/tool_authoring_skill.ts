/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { createProposeToolTool } from './propose_tool';
import { createPatchToolTool } from './patch_tool';

const TOOL_AUTHORING_REFERENCE_NAME = 'tool-authoring-examples';

/**
 * Built-in skill that teaches the agent how to author Agent Builder tools
 * conversationally. MVP supports ES|QL tools only; other tool types
 * (workflow, MCP, index_search) are out of scope for chat authoring at this
 * stage and remain form-only.
 */
export const toolAuthoringSkill = defineSkillType({
  id: 'tool-authoring',
  name: 'tool-authoring',
  basePath: 'skills/platform/agent-builder',
  experimental: true,
  description:
    'Author a new Agent Builder ES|QL tool from a chat description. Use when the user asks to create, build, generate, or design a tool that runs an ES|QL query with parameters.',
  content: dedent(`
## When to Use This Skill

Use this skill when:
- The user asks to "create / build / make / scaffold a tool" for an agent.
- The user describes an ES|QL query they want to make reusable with parameters (a top-N, a filter, a time-window query).
- The user wants to wrap a query they already have so an agent can call it by name.

Do **not** use this skill when:
- The user only wants to run a one-off ES|QL query (just run it).
- The user wants to edit an already-persisted tool — direct them to the tool editor at /manage/tools/{tool_id}.
- The user wants a workflow, MCP, or index_search tool — chat authoring currently supports ES|QL tools only. Tell the user and offer to draft the ES|QL equivalent or point them at the form-based editor.

## Available Tools

After reading this SKILL.md, two inline tools become available:

- **propose_tool** — Captures a complete first-draft payload (id, type, description, optional tags, ES|QL configuration with query + params) as a versioned \`tool\` attachment in the conversation. Returns \`attachment_id\` and \`version\`. Fails if the id already exists, the ES|QL syntax is invalid, or a \`?param\` binding has no matching entry in \`params\` (and vice versa).
- **patch_tool** — Refines an existing draft by attachment_id. Supports description/tags replacement, full or search-replace query edits, and add/update/remove operations on params. Each call re-validates the merged config; failures leave the draft unchanged.

Two **registry tools** are also relevant — they're not inline tools from this skill, but they're available in the standard tool registry and the workflow below leans on them heavily:

- **\`platform.core.generate_esql\`** — Natural-language → ES|QL. Pass the user's description and (optionally) the target index pattern. The tool generates a candidate query and validates it by running against the user's real data, so the query returned uses field names that actually exist in their mappings. **Use this before writing ES|QL from scratch.**
- **\`platform.core.execute_esql\`** — Run an ES|QL query with optional named-param bindings. Useful for sanity-checking a parameterized draft against concrete values before showing the user the draft card.

## Authoring Workflow

1. **Clarify intent first if the request is vague.**
   - Ask up to 2 short questions if the user has not described the *purpose* of the tool (what should an agent ask it for?) or the *data source* (which index / data stream?).
   - If the user already gave enough detail, skip ahead.

2. **Pick an id, description, and tags.**
   - \`id\`: lowercase letters, numbers, dots, hyphens, and underscores; must start and end with a letter or number. Max 64 chars. Use dotted namespaces for grouping. Example: \`logs.top_error_counts\`. If the id already exists, propose_tool will reject it — pick a more specific variant.
   - \`description\`: lead with **when** an agent should pick this tool. Example: "Use when the user asks for the most frequent error message types in a logs-* index over a recent time window." This is a routing hint, not user-facing copy.
   - \`tags\`: optional. Use sparingly.

3. **Generate the starting query with \`platform.core.generate_esql\` — don't write ES|QL from scratch.**
   - Pass the user's description (lightly cleaned up if needed) as \`query\`. If the user mentioned an index or data stream, pass it as \`index\`. Leave \`execute_query: true\` (the default) so the returned query is validated against the user's actual mappings — this catches field-name guesses (\`log.level\` vs \`log.flags\`) immediately.
   - The tool returns a working ES|QL string. Treat that as your draft body — copy it verbatim, then move on to parameterizing it. **Do not invent field names** based on conventions; the field names in the returned query came from the user's real index mappings and should be preserved.
   - If \`generate_esql\` fails (no matching index, no relevant fields), ask the user one short clarifying question (which index? which field?) rather than guessing.

4. **Parameterize the query with \`?name\` bindings.**
   - Look at the generated query and identify the literals that should be tuneable per call: the \`LIMIT N\`, narrow filters (specific service name, log level, severity), comparison thresholds.
   - Replace each tuneable literal with \`?name\` and add a matching entry to \`configuration.params\`. Reference parameters via one \`?\` followed by the param key. Example: \`LIMIT 10\` becomes \`LIMIT ?top_n\` with a \`top_n\` integer param.
   - Every \`?name\` in the query must have a matching entry in \`configuration.params\`. Every key in \`params\` must appear as \`?name\` in the query. Orphans on either side fail validation.
   - **Time windows: prefer embedding \`NOW() - N hours\` (or \`days\`, \`minutes\`) directly in the query as a fixed literal.** ES|QL does **not** accept relative-time strings (\`now-24h\`, \`now-7d\`) as values for a \`?param\` binding — it strictly requires an ISO 8601 datetime there. If the lookback truly needs to be configurable per call, parameterize the *number* of hours/days as an \`integer\` and write \`WHERE @timestamp >= NOW() - ?lookback_hours hours\`. Only use a \`date\`-typed \`?param\` when the caller will pass an actual ISO timestamp (e.g., a known incident start time).
   - **Don't over-parameterize.** Every param is a decision the calling agent has to make at runtime — the more params, the higher the chance of a wrong call. Parameterize values that meaningfully change between calls (limits, identifiers, thresholds); keep structural things (which index, which aggregation function, which fields) as literals.

5. **Define each parameter.**
   - \`type\`: one of \`string\`, \`integer\`, \`float\`, \`boolean\`, \`date\`, \`array\`.
     - \`date\`: **strict ISO 8601 only** at call time (e.g. \`"2024-05-20T00:00:00Z"\`). Relative strings like \`"now-24h"\` will fail in ES|QL execution — do not use them for \`date\` params, and do not use them as \`defaultValue\`. If you find yourself wanting \`"now-24h"\`, the right move is to either embed \`NOW() - 24 hours\` directly in the query (no param) or use an \`integer\` param for the number of hours.
     - \`array\`: only when the query uses \`IN (...)\` or a similar list form.
   - \`description\`: **load-bearing — write it for the agent that will call the tool, not for end users.** Say what the param means, the expected format, and any reasonable defaults to suggest. For a \`date\` param: "ISO 8601 datetime, e.g. \`2024-05-20T00:00:00Z\`. To filter by relative windows, write the query with \`NOW() - N hours\` instead."
   - \`optional\`: defaults to false. Set \`true\` only when the query works correctly with the parameter unset.
   - \`defaultValue\`: only valid when \`optional: true\`. Type must match \`type\`. For \`date\`, the default must be an ISO 8601 string (or omit the default and use \`NOW()\` in the query instead).

6. **(Optional) Sanity-check with \`platform.core.execute_esql\`.**
   - For a non-trivial query, before \`propose_tool\` you can run the parameterized query against the user's data using \`execute_esql\` with concrete \`params\` values (e.g. \`top_n: 5\`). This catches mapping mismatches, type errors, or empty-result patterns before the user sees a draft. Skip for simple queries; it costs latency.

7. **Call \`propose_tool\`.**
   - Pass the full payload in one shot.
   - On success the tool returns \`attachment_id\` and \`version\`.
   - **On failure:** the error message lists the specific problems (syntax, undefined params, type mismatches). Fix in the next call — usually a single \`patch_tool\` covers it.

8. **Render the draft inline — exactly once per response.**
   - Emit \`<render_attachment id="ATTACHMENT_ID" />\` (replacing \`ATTACHMENT_ID\` with the value from the tool result) **at the end of your response**, after at most one short sentence of prose. Do not surround it with quotes or a code fence.
   - **Do not repeat the render tag.** Emit it once and only once per response — never once near the top and again at the bottom.
   - **Do not restate what the card already shows.** The card already renders the description, the ES|QL query, and the parameter list with their types and descriptions. Listing parameters again as bullet points, dumping the query as a code block, or summarizing the "query shape" duplicates what the user is about to see and clutters the chat. Just say what you drafted in one sentence (e.g., "I drafted \`logs.top_error_counts\` with two optional parameters.") and let the card speak.

9. **Iterate on feedback via \`patch_tool\`.**
   - When the user asks for changes ("rename \`top_n\` to \`limit\`", "broaden to include FATAL", "filter only to ERROR level"), call \`patch_tool\` with the existing \`attachment_id\` and only the fields that need to change.
   - For small query edits prefer \`query_patches\` (search-replace) over a full \`query\` rewrite.
   - Renaming a parameter means: a \`query_patches\` entry to rename \`?old\` → \`?new\`, plus \`params_to_remove: ['old']\` and \`params_to_add: { new: { ... } }\`. Or use \`params_to_update\` if you're just tweaking type/description.
   - For larger structural changes (different aggregation, new join), it can be cleaner to call \`platform.core.generate_esql\` again with an updated description and then patch the query as a full \`query\` replacement.
   - After each patch, re-render the attachment so the card refreshes in place.

10. **Encourage the user to test before persisting.**
    - The card's **Preview** button opens the canvas, where the user can enter parameter values and run the draft against their real data without persisting.
    - Suggest concrete sample values matching the param types — e.g. \`top_n=5\` for an integer; for a \`date\` param, an actual ISO timestamp like \`2024-05-20T00:00:00Z\` (not \`now-24h\`, which is not valid ES|QL parameter input).

11. **When the user is happy, point them at the Create button.**
    - The card itself wires "Create tool" to \`POST /api/agent_builder/tools\`. You do **not** need to call any HTTP endpoint yourself — the user clicks the button.
    - If the user lacks the \`manageTools\` privilege, the button is disabled with a tooltip; nudge them to ask an admin.

## Examples

See the referenced file \`${TOOL_AUTHORING_REFERENCE_NAME}.md\` for a complete worked example (initial draft + a follow-up patch).
  `),
  referencedContent: [
    {
      relativePath: './examples',
      name: TOOL_AUTHORING_REFERENCE_NAME,
      content: dedent(`
# Tool Authoring Examples

## Example 1: full first-draft flow (generate → parameterize → propose → render)

User said: "Build me a tool that returns the top N error message types from logs-* in the last 24 hours."

**Step 1 — generate a candidate query.** Call \`platform.core.generate_esql\` with the user's description and the index they mentioned. Setting \`execute_query: true\` (the default) means the returned query is validated against the user's actual mappings — this catches field-name guesses before they reach the draft.

\`generate_esql\` input:

\`\`\`json
{
  "query": "Return the top error message types from logs-* in the last 24 hours, ranked by count",
  "index": "logs-*",
  "execute_query": true
}
\`\`\`

Returned query (example — yours will reflect the real field names in the user's mappings):

\`\`\`
FROM logs-* | WHERE log.level == "ERROR" AND @timestamp >= NOW() - 24 hours | STATS count = COUNT(*) BY error.message | SORT count DESC | LIMIT 10
\`\`\`

**Step 2 — identify what to parameterize.** The user said "top N" — \`LIMIT 10\` should become \`LIMIT ?top_n\`. The lookback window is described as a fixed "last 24 hours", so keep \`NOW() - 24 hours\` as a literal rather than parameterizing it as a \`date\` (which would have to be ISO 8601). The index, log level, and aggregation shape are structural — leave them as literals.

**Step 3 — call \`propose_tool\`** with the parameterized query:

\`\`\`json
{
  "id": "logs.top_error_counts",
  "type": "esql",
  "description": "Use when the user asks for the most frequent error message types in a logs-* index over the last 24 hours. Returns the top N message strings ranked by count.",
  "configuration": {
    "query": "FROM logs-* | WHERE log.level == \\"ERROR\\" AND @timestamp >= NOW() - 24 hours | STATS count = COUNT(*) BY error.message | SORT count DESC | LIMIT ?top_n",
    "params": {
      "top_n": {
        "type": "integer",
        "description": "Maximum number of message types to return, ranked by count descending.",
        "optional": true,
        "defaultValue": 10
      }
    }
  }
}
\`\`\`

(See the **Pattern library** further down for variants — configurable lookback, ISO date params, percentiles, time bucketing, watchlists.)

Tool result:

\`\`\`json
{
  "attachment_id": "att-abc123",
  "version": 1,
  "tool_id": "logs.top_error_counts",
  "tool_type": "esql",
  "param_count": 2
}
\`\`\`

Assistant reply (one sentence + render tag, nothing else):

\`\`\`xml
I drafted \`logs.top_error_counts\` with two optional parameters.

<render_attachment id="att-abc123" />
\`\`\`

Do **not** list the parameters or echo the query above the tag — the card renders both. Do **not** emit a second render tag at the bottom of the response.

## Example 2: follow-up patch (rename a parameter)

User said: "Rename \`top_n\` to \`limit\` and keep the default of 10."

This requires three changes: rename the binding inside the query, remove the old param key, and add a new one with the same metadata. (Alternative: use \`params_to_update\` if only type/description/defaultValue changes — but renames change the key, which means add+remove.)

\`patch_tool\` payload:

\`\`\`json
{
  "attachment_id": "att-abc123",
  "query_patches": [
    { "find": "LIMIT ?top_n", "replace": "LIMIT ?limit" }
  ],
  "params_to_remove": ["top_n"],
  "params_to_add": {
    "limit": {
      "type": "integer",
      "description": "Maximum number of message types to return, ranked by count descending.",
      "optional": true,
      "defaultValue": 10
    }
  }
}
\`\`\`

Tool result:

\`\`\`json
{
  "attachment_id": "att-abc123",
  "version": 2,
  "tool_id": "logs.top_error_counts",
  "tool_type": "esql",
  "param_count": 2
}
\`\`\`

Assistant reply (single sentence + the render tag at the end, no echo of params/query):

\`\`\`xml
Renamed \`top_n\` to \`limit\` (default 10).

<render_attachment id="att-abc123" />
\`\`\`

## Example 3: recovery from a validation failure

If \`propose_tool\` returns an error like:

\`\`\`
Invalid ES|QL tool draft. Fix and retry:
- Query references parameters that aren't defined in 'params': severity. Defined params: top_n.
\`\`\`

Either add the missing param via the next \`propose_tool\` call, or — if the previous propose succeeded and the issue surfaced from a patch — call \`patch_tool\` with \`params_to_add\` for \`severity\`. Apologize briefly and explain what was missing.

## Example 4: do NOT do this (common ES|QL date pitfall)

**Wrong:**

\`\`\`json
{
  "configuration": {
    "query": "FROM logs-* | WHERE @timestamp >= ?since | LIMIT ?top_n",
    "params": {
      "since": { "type": "date", "description": "...", "optional": true, "defaultValue": "now-24h" },
      "top_n": { "type": "integer", "description": "...", "optional": true, "defaultValue": 10 }
    }
  }
}
\`\`\`

This propose call may pass schema validation, but the tool will fail at execution time with \`Cannot convert string [now-24h] to [DATETIME]\` — ES|QL strictly requires ISO 8601 for \`?date\` bindings. The pattern in Example 1 (embed \`NOW() - 24 hours\` directly, or parameterize as integer hours) is the right shape.

---

## Pattern Library

The examples below show \`propose_tool\` payloads for common ES|QL tool shapes. Each one assumes you've already called \`platform.core.generate_esql\` to ground the query in the user's real index mappings — the JSON below is the *final* propose payload after parameterization.

## Example 5: latency percentiles per endpoint

**User said:** "Build me a tool that shows p50, p95, p99 latencies per APM endpoint over the last hour, filtered to endpoints with enough traffic to be meaningful."

**Shape teaches:** \`PERCENTILE\` with multiple percentiles in a single \`STATS\`, multi-column \`GROUP BY\`, post-aggregation \`WHERE\` (filtering on the aggregated \`sample_count\`), and mixing a required-by-convention param with optional defaults.

\`\`\`json
{
  "id": "apm.endpoint_latency_percentiles",
  "type": "esql",
  "description": "Use when investigating slow APM endpoints. Returns p50/p95/p99 transaction durations grouped by service and transaction name, filtered to endpoints with at least min_samples requests so noisy low-traffic endpoints don't dominate.",
  "configuration": {
    "query": "FROM traces-apm-* | WHERE @timestamp >= NOW() - ?lookback_hours hours | STATS p50 = PERCENTILE(transaction.duration.us, 50), p95 = PERCENTILE(transaction.duration.us, 95), p99 = PERCENTILE(transaction.duration.us, 99), sample_count = COUNT(*) BY service.name, transaction.name | WHERE sample_count >= ?min_samples | SORT p95 DESC | LIMIT ?top_n",
    "params": {
      "lookback_hours": {
        "type": "integer",
        "description": "How many hours of trace data to include. Use 1 for hot-path investigation, 24 for daily summaries, 168 for weekly trend baselines.",
        "optional": true,
        "defaultValue": 1
      },
      "min_samples": {
        "type": "integer",
        "description": "Drop endpoints with fewer than this many requests in the window. Prevents one-off slow requests from a low-traffic endpoint from dominating the top-N. Use 100 for production traffic, 10 for staging.",
        "optional": true,
        "defaultValue": 100
      },
      "top_n": {
        "type": "integer",
        "description": "Maximum endpoints to return, ranked by p95 descending.",
        "optional": true,
        "defaultValue": 20
      }
    }
  }
}
\`\`\`

## Example 6: bucketed error rate over time

**User said:** "I want to see the error rate for a service over time, bucketed every 15 minutes by default but tuneable."

**Shape teaches:** \`BUCKET(@timestamp, ?n minutes)\` for time histograms with a tuneable bucket size; conditional aggregation via \`COUNT(*) WHERE ...\` alongside an unconditional total in the same \`STATS\`; \`EVAL\` for a derived ratio column; \`TO_DOUBLE\` to avoid integer division returning zero; a required string param with no default.

\`\`\`json
{
  "id": "logs.service_error_rate_over_time",
  "type": "esql",
  "description": "Use when the user wants to plot error rate for a specific service over time. Returns one row per bucket with the absolute error count, total request count, and the computed error rate as a percentage. Pair with a chart that puts time on the x-axis.",
  "configuration": {
    "query": "FROM logs-* | WHERE service.name == ?service_name AND @timestamp >= NOW() - ?lookback_hours hours | STATS errors = COUNT(*) WHERE log.level IN (\\"ERROR\\", \\"FATAL\\"), total = COUNT(*) BY bucket = BUCKET(@timestamp, ?bucket_minutes minutes) | EVAL error_rate_pct = TO_DOUBLE(errors) / total * 100 | SORT bucket ASC",
    "params": {
      "service_name": {
        "type": "string",
        "description": "Exact service.name to filter on. The caller must supply this — there is no sensible default."
      },
      "lookback_hours": {
        "type": "integer",
        "description": "Total time range to cover, in hours.",
        "optional": true,
        "defaultValue": 24
      },
      "bucket_minutes": {
        "type": "integer",
        "description": "Bucket size in minutes. Use 1 for tight zoom on a single incident, 15 for a day-long view, 60 for a week-long view. Picking a bucket much smaller than the lookback divided by ~200 produces too many points to render comfortably.",
        "optional": true,
        "defaultValue": 15
      }
    }
  }
}
\`\`\`

## Example 7: suspicious-IP watchlist investigation

**User said:** "Give me a tool I can call with a list of suspicious source IPs to see how aggressive they've been recently — drop counts, unique targets, unique ports."

**Shape teaches:** \`array\` param consumed by an \`IN (?param)\` predicate; \`COUNT_DISTINCT\` for cardinality questions ("how many *unique*…"); multiple parallel aggregations in a single \`STATS\` clause; a required \`array\` param with no sensible default.

\`\`\`json
{
  "id": "firewall.suspicious_ip_activity",
  "type": "esql",
  "description": "Use when investigating a set of known-suspicious source IPs (e.g. from a threat-intel feed or a prior detection). Returns per-IP attempt counts, the spread of targeted destination IPs, and the spread of targeted destination ports — high cardinality on targets/ports is a strong scanning signal.",
  "configuration": {
    "query": "FROM firewall-logs-* | WHERE @timestamp >= NOW() - ?lookback_hours hours AND action == \\"drop\\" AND source.ip IN (?suspicious_ips) | STATS attempts = COUNT(*), unique_targets = COUNT_DISTINCT(destination.ip), unique_ports = COUNT_DISTINCT(destination.port) BY source.ip | SORT attempts DESC | LIMIT ?top_n",
    "params": {
      "suspicious_ips": {
        "type": "array",
        "description": "List of source IPs to investigate, as strings. Pass as an array even if there's only one (e.g. ['10.0.0.5']). Used inside an IN clause; element type must be string."
      },
      "lookback_hours": {
        "type": "integer",
        "description": "How many hours back to scan. Use 1 for fresh activity, 24 for daily review, 168 for weekly retrospective.",
        "optional": true,
        "defaultValue": 24
      },
      "top_n": {
        "type": "integer",
        "description": "Maximum number of source IPs to return, ranked by attempt count descending.",
        "optional": true,
        "defaultValue": 25
      }
    }
  }
}
\`\`\`

## Example 8: incident-time-anchored error breakdown (when a \`date\` param IS the right call)

**User said:** "For an incident that started at a specific time, show me the top error messages in the hour after it started, broken down by service."

**Shape teaches:** when a \`date\` param genuinely is correct — the caller has a concrete ISO timestamp in mind, not a relative window; date arithmetic in the predicate (\`?incident_start + 1 hour\`); a required \`date\` param with no default; pivoting the window around a supplied anchor rather than \`NOW()\`.

\`\`\`json
{
  "id": "incidents.error_breakdown_after",
  "type": "esql",
  "description": "Use when the user has a specific incident start time and wants to know which services/messages contributed most in the window immediately following. Returns the top error messages per service in the hour after the supplied incident_start.",
  "configuration": {
    "query": "FROM logs-* | WHERE @timestamp >= ?incident_start AND @timestamp < ?incident_start + 1 hour AND log.level IN (\\"ERROR\\", \\"FATAL\\") | STATS count = COUNT(*) BY service.name, error.message | SORT count DESC | LIMIT ?top_n",
    "params": {
      "incident_start": {
        "type": "date",
        "description": "ISO 8601 datetime marking when the incident started, e.g. '2024-05-20T14:30:00Z'. The tool scans the hour AFTER this timestamp. Do not pass relative expressions like 'now-1h' — those are not valid ES|QL date parameter values; use NOW()-based queries (see other tools) for those."
      },
      "top_n": {
        "type": "integer",
        "description": "Maximum (service, message) pairs to return.",
        "optional": true,
        "defaultValue": 20
      }
    }
  }
}
\`\`\`

## Picking the right pattern at a glance

| User intent | Right pattern | See |
|-------------|---------------|-----|
| "last N hours/days" fixed window | Embed \`NOW() - N hours\` as literal | Example 1 |
| "last N hours" but caller-tuneable | \`integer\` param for hours, \`NOW() - ?hours hours\` | Example 6 |
| Anchored to a specific timestamp the caller knows | \`date\` param with ISO 8601 | Example 8 |
| Top-N aggregation | \`integer\` \`top_n\` with default | Examples 1, 5, 7 |
| Multiple statistics in one tool | Parallel aggregations in one \`STATS\` | Examples 5, 6, 7 |
| Filter by a list of values | \`array\` param + \`IN (?param)\` | Example 7 |
| Time-series / chart-ready output | \`BUCKET(@timestamp, ?n minutes)\` | Example 6 |
| Cardinality / uniqueness question | \`COUNT_DISTINCT(...)\` | Example 7 |
| Computed ratio or rate | \`EVAL ratio = TO_DOUBLE(num) / denom\` | Example 6 |
      `),
    },
  ],
  getInlineTools: () => [createProposeToolTool(), createPatchToolTool()],
});

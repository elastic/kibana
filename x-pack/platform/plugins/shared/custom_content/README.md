# custom_content

A Kibana dashboard embeddable that renders AI-generated or hand-authored HTML panels, optionally backed by a live ES|QL query.

> **Technical preview** — custom panels are in technical preview and may change or be removed in a future release.

## Overview

A `custom_content` panel stores two pieces of state (both optional) alongside the standard panel titles:

| Field | Type | Purpose |
|-------|------|---------|
| `esql_query` | `string[] \| undefined` | Optional ES\|QL queries whose results are injected into the template at render time. The first is the panel's main query (`rows`); up to ten are allowed (`CUSTOM_CONTENT_MAX_ESQL_QUERIES`) and the rest are read by position as `queries[n]`. The whole list is passed around as one array; only the chat attachment keeps the first query in its own field (`esql_query`, with the rest in `additional_esql_queries`), converted by `readContextQueries` / `toContextQueries`. The edit flyout and the agent tools can both add, change and (for the flyout, from the end) remove queries |
| `template` | `string \| undefined` | LiquidJS HTML template — the actual rendered content |

Panels are saved as part of the dashboard's serialized state (standard embeddable contract, `server/embeddable/schemas.ts`). No separate saved object is created. Both `template` and `esql_query` participate in unsaved-change detection (`esql_query` compares with `deepEquality`, since a fresh array would otherwise look changed on every serialize).

The template is the source of truth for what renders. It is either generated server-side (agent builder, or "Generate with chat" from the flyout) or hand-authored in the flyout's editor. Nothing is regenerated at render time.

### Shared packages

| Package | Contents |
|---------|----------|
| `@kbn/custom-content-common` | Constants (embeddable type, size limits, CSP meta), the zod state schema, the chat tool's update schema (`customContentPanelUpdateSchema`), `stripMarkdownFences` |
| `@kbn/custom-content-server` | `createCustomContentTemplateResolver` (the LLM template generator) and `sanitizeCellValue` |

Both packages are separate from `agent_builder_dashboards` because this plugin and the dashboard generation tool consume the same code.

## Entry points

### Add panel menu

`getAddCustomContentAction` registers a **Custom** entry in the dashboard "Add panel" menu (`ADD_PANEL_TRIGGER`, visualization group). It adds an empty panel and immediately opens the edit flyout with `isNewPanel: true`. If the flyout closes without saving, the placeholder panel is removed again — unless the user left via "Generate with chat", which retains the panel so the chat can fill it in.

An empty panel renders `CustomContentEmptyPrompt` ("Create your custom panel") with a "Generate with chat" call to action when agent builder is available.

### Agent builder chat

See [Agent builder integration](#agent-builder-integration) below.

## Rendering paths

`use_custom_content_html.ts` picks one of these on every render cycle:

```
no template
  └─ render the empty prompt

template only (no query)
  └─ sanitize + inject theme CSS → render immediately, no network call

template + esqlQuery
  └─ fetchEsqlData(query, timeRange, { filters, query, isApproximate, projectRouting })
     └─ fillTemplate(template, columns, rows) → LiquidJS render → sanitize → display
```

All paths bypass the LLM entirely at render time. Template generation happens once at creation or edit time, not on every render.

The resulting HTML is rendered in an `<iframe sandbox="" srcDoc={...}>`. "Run Preview" from the flyout pushes HTML through a separate `previewHtml$` subject that takes precedence over the saved template, so users can see a draft without saving it; it is cleared when the flyout closes or when a non-reload fetch arrives.

### Unified search

The embeddable subscribes to `fetch$` and republishes `timeRange`, `query`, `filters`, `isApproximate`, and `projectRouting` so ES|QL results respect the dashboard's time picker, KQL bar, filter pills, and approximation setting. It also publishes:

- `usesEsql$` — whether the panel currently has a query.
- `dataSources$` — an ad-hoc data view derived from the ES|QL query (`getESQLAdHocDataview`), which is what gives the KQL bar and filter builder field suggestions for this panel.

### Theming

Theme CSS custom properties are injected client-side from `useEuiTheme()` (`buildThemeCss` in `prepare_html.ts`), so dark mode works correctly including when `theme: darkMode` is `'system'`. Changing the theme updates the CSS without re-fetching ES|QL data.

Available variables: `--cc-color-text`, `--cc-color-background`, `--cc-color-surface`, `--cc-color-primary`, `--cc-color-accent`, `--cc-color-accent-2`, `--cc-color-warning`, `--cc-color-danger`, `--cc-color-border`. The generation prompt instructs the LLM to use these rather than hard-coded colors.

## Template syntax

Templates use [LiquidJS](https://liquidjs.com/) syntax. `fill_template.ts` exposes two variables:

- `rows` — array of row objects, keyed by exact column name. Each column resolves to an object with `.value` (raw cell value) and `.pct` (the value as 0–100 percent of that column's max across all rows; numeric columns only, useful for bar widths).
- `max` — object of per-column maximums, keyed by exact column name.
- `queries` — one entry per query in `esql_query`, in order. `queries[n]` has its own `rows` and `max` (`.pct` is relative to that query's own max). `rows` and `max` are the same as `queries[0]`. All queries run in parallel with the panel's time range and filters, and if one fails the whole panel shows an error that names it.

```html
{% assign totals = queries[0].rows.first %}
{% for row in queries[1].rows %}
  <span>{{ row["service"].value }}</span>
{% endfor %}
```

```html
{% if rows.size == 0 %}<p>No data</p>{% endif %}
{% for row in rows %}
  <span>{{ row["category"].value }}</span>
  <div style="width: {{ row["revenue"].pct }}%"></div>
{% endfor %}
```

Aggregation and sorting are not available in the template — it receives `rows` as the ES|QL query returned them, so grouping belongs in `STATS ... BY ...` upstream.

JavaScript is explicitly blocked — the iframe sandbox, a strict CSP, and `DOMPurify` all independently prevent script execution.

## Edit flyout

Opening the panel context menu → Edit renders `EditCustomContentFlyout`, which lets users:

- Edit the LiquidJS template directly in a Monaco editor (`liquid` language mode), with a copy-to-clipboard button and a vertically resizable editor pane
- Edit the panel's ES|QL queries, one tab each (`EsqlDataSection`, built on `UnifiedTabs`), with a live data preview per query (`EsqlQueryEditor`). The caption under the tabs names the variable the template reads the selected query as: `rows` for the first, `queries[n].rows` for the others. The "+" at the end of the tab row adds a query (up to ten, and not while the first is empty). Only the last query has a "Remove query" menu, because removing one earlier would move the queries after it up a position and the template reads them by position. The first query is `rows` and cannot be removed
- Hand off to the AI chat sidebar with the current draft attached, queries included — labelled "Refine with chat" when a template already exists and "Generate with chat" when the editor is empty, and shown only when `agentBuilder` is available

"Run preview" fetches every query of the draft and renders the result into the panel without saving. It is enabled whenever there is a template. "Apply and close" is enabled only when the template or any of the queries has changed from the saved state (a query added or removed counts). Blank queries at the end of the list are dropped when the draft is saved.

A blank query that has filled queries after it is not allowed to stay: the template would read the later queries at positions they will not have. While one exists, a warning in the data section names it, and "Run preview", "Apply and close" and "Refine with chat" are disabled, each with a tooltip that says why. A draft where every query is blank is fine: it is a static panel.

## Agent builder integration

When `agentBuilder` is available (optional plugin dependency), the panel participates in two ways.

### 1. Refine an existing panel via chat

"Refine with chat" attaches the current template, query, panel title, and panel id as a `platform.custom_content.panel_context` attachment and opens the chat sidebar. The `embeddable_id` field identifies which panel on the dashboard owns the attachment.

The conversation is the ordinary dashboard chat — panels are not given their own chat session. Isolation comes from the attachment rather than the conversation: each panel gets a stable attachment id (`platform.custom_content.panel_context-<embeddableId>`, see `utils/chat_integration.ts`) so re-pushing a panel's context replaces its previous snapshot instead of accumulating duplicates, and every consumer keys off `embeddable_id`. A single round can therefore carry the dashboard attachment plus one attachment per custom content panel, and each panel picks out its own.

The attachment type is registered server-side in `server/attachment_types/custom_content_context.ts` and client-side in `public/attachment_types/custom_content_context.ts`.

A server-side builtin tool, `custom_content_update_panel` (`server/tools/update_custom_content_tool.ts`), accepts `embeddable_id` plus `prompt`, `dataQueries` and/or `removeAllQueries` — never a `template`. It resolves a new template via the shared resolver, merges the result into that panel's attachment, and updates it with `actor: agent`. The embeddable subscribes to `RoundCompleteEvent` and scans every agent-authored create/update ref in the round for a `platform.custom_content.panel_context` attachment whose `embeddable_id` matches its own uuid, then applies that template and query. It scans all refs rather than only the first, because a round routinely touches the dashboard attachment and other panels' attachments too.

`removeAllQueries: true` removes every query. A `dataQueries` entry with a `description` (which needs a `prompt`) regenerates the query at its position on the server from the description, seeded with the stored query so the parts the request does not change are kept; without it, an edit keeps the stored queries, so a style-only edit never pays for query generation or schema sampling. An entry with `esql` replaces the query at its position as it is.

#### Targeting the right panel

`embeddable_id` is **required**. One conversation can hold a context attachment per panel, so without an explicit target the tool would act on whichever panel was attached first — refining a second panel would silently edit the first. The id is surfaced to the agent in each attachment's text representation (`Custom content panel (embeddable_id: …)`, see `formatPanelContext`) and echoed in `getAgentDescription()`.

This is why the tool's schema, `customContentPanelUpdateSchema` (`@kbn/custom-content-common`), carries `embeddable_id` alongside `prompt`, `dataQueries` and `removeAllQueries`, with an "at least one of them" rule, a rule that a data query with a `description` needs a `prompt`, and a rule that `removeAllQueries` cannot be combined with `dataQueries`. The dashboard generation tool does not need an identifier in its input: it targets panels by their id in `panels`.

#### Panels that are not attached

Only panels the user explicitly sent to chat via "Refine with chat" have a context attachment. Asking a fresh conversation to update some other custom content panel therefore misses, even though the panel is visible on the dashboard.

That is recoverable rather than fatal: the dashboard attachment is added automatically for a new conversation (`dashboard_app_integration.ts`), and `generate_dashboard` edits a panel listed by id in `panels` with `source: "request"`, `renderer: "custom_content"` content, needing no context attachment at all. Both the tool description and the not-found error therefore name `platform.dashboard.generate_dashboard` as the route to take, alongside the ids that *are* attached. Without that the agent dead-ends and invents its own remediation — in practice, asking the user to click the panel, which attaches nothing.

Two consequences worth knowing. The fallback applies the change through `api.setState(...)`, a whole-dashboard state replace, rather than the targeted `template$`/`esqlQuery$` update the attachment route uses. And the tool id is inlined as a string constant rather than imported from `@kbn/agent-builder-dashboards-common`, to avoid a plugin dependency for prompt copy — it needs keeping in sync with `dashboardTools.generateDashboard`.

#### Preview and version history

The tool returns `attachment_id` and `version`, and both the tool description and the attachment's `getAgentDescription()` instruct the agent to emit `<render_attachment id="…" version="…" />` in its answer. That tag is what renders the attachment card for the round; the panel update itself is applied independently via `RoundCompleteEvent`, so a round without the tag still updates the panel, it just doesn't offer a card to preview from.

The card carries a single **Preview** action (`public/attachment_types/custom_content_context.ts`), which applies that card's version to the live panel — the same in-place state swap the dashboard attachment performs, not a separate preview container. The definition deliberately provides neither `renderInlineContent` nor `renderCanvasContent`, since either would make agent builder open its canvas flyout instead.

Because each round's card is pinned to the version that round produced, clicking Preview on an earlier round steps the panel back to that template, and clicking a later one steps it forward. The button reaches the panel through a small `embeddableId → handler` registry (`utils/panel_preview_registry.ts`) that mounted panels register into; when the panel is not mounted the action warns instead of failing silently. The handler is lazy-loaded so the registry and its copy stay out of the plugin's page-load bundle.

### 2. Agent-driven dashboard creation and editing

The dashboard generation tool in `agent_builder_dashboards` treats custom content as a generated panel, like Lens and Vega: `source: "request"` with `renderer: "custom_content"` (schemas in `.../dashboard-agent-authoring/src/panels/custom_content/index.ts`). The agent supplies `query` (what to display, or what to change) and `dataQueries` or `removeAllQueries` (one of them is required when adding a panel); it never supplies `template`. The server builds the panel in `.../resolvers/custom_content_panel_resolver.ts`, a thin adapter on the custom content builder (see below), in the same parallel phase as the tool's other generated panels.

A static panel has no query: a new panel must say which kind it is (there is no default). `removeAllQueries: true` is static, so a banner never gets a stray `ROW` query, and omitting both is a validation error, so a panel that should show data can't silently be generated with no data and invented numbers. With `dataQueries` the server generates a query for each entry from its `description` (and `index`). On an edit, omitting `dataQueries` keeps the current queries, an entry with a `description` regenerates the query at its position from the stored one, `{}` keeps it, and `removeAllQueries: true` removes every query. The visualization tool (`create_visualization` with `target.type: "custom_content"`) uses the same vocabulary.

An edit targets a panel by its id in `panels`, so this path can reach any custom content panel on the dashboard whether or not it has a chat attachment. That makes it the fallback described above.

### Panels with several queries

A panel can have up to ten queries. The template reads the first as `rows` and the n-th as `queries[n].rows`, and the agent and the flyout can both create and change them:

- The agent describes the queries in `dataQueries`, by position, in the dashboard generation tool, `custom_content_update_panel` and `create_visualization`. An entry with a `description` generates the query at that position (on an edit, from the stored one, so the parts the request does not change survive), one with `esql` replaces it as it is, `{}` keeps it, and an entry past the stored queries adds one. Queries the request does not name are kept, and `removeAllQueries: true` removes every query. A single query is just one entry.
- The context attachment carries the queries as `esql_query` (the first) and `additional_esql_queries`, and its text lists each one with the name the template reads it by (`queries[1]`, …). The chat card renders them, and an applied update, including `Preview` on an earlier version, puts them back on the panel.
- The tools pass the panel's queries to `buildCustomContentConfig` in `existing`, so an edit that does not name a query keeps it. "Refine with chat" from the flyout sends the queries of the draft, so an agent update starts from what the user is editing.
- The template resolver is told about every query. For each query after the first it gives the model the text and the name the template reads it by. A query of any position that is new or changing is also run, all at once, so the model sees its columns; one that is not changing is not run, because the template that already reads it describes it. That holds for the first query and the others alike, so a change to `queries[2]` is sampled even when the first query is untouched. A restyle runs nothing and still keeps the `queries[n]` references. When the panel has several queries the system prompt also explains the `queries[n]` naming and how to use each query (`MULTI_QUERY_DATA_MODEL_GUIDANCE` in the resolver). Panels with one query get the same prompt as before.
- The query generator is told separately when a panel has several queries: its instructions (`CUSTOM_CONTENT_MULTI_QUERY_INSTRUCTIONS` in `custom_content_esql.ts`) say that each query feeds one part of the template, that headline numbers come back as one row, and that columns are named in `snake_case`.
- Sampling errors name the query that failed when the panel has several (`Query 2 (queries[1]): …`), and the request fails instead of writing a template for data it could not read.

### One builder for the three flows

The dashboard generation tool, `custom_content_update_panel` and `create_visualization` all build a custom content panel with `buildCustomContentConfig` (`@kbn/agent-builder-visualizations-server`), next to `buildLensConfig` and `buildVegaConfig`. All three take the same input, `dataQueries` or `removeAllQueries`, and pass it on as it is; none of them decides anything about the query or the template itself.

The builder is told what to do with the queries in one way: `dataQueries`, by position (a `description` generates or regenerates the query there, `esql` replaces it, `{}` keeps it, a position past the stored queries adds one, and queries not listed are kept), or `removeAllQueries` to make the panel static. Without either, an edit keeps the stored queries, so a style-only edit never pays for generation. Generation uses the custom content instructions (one row per item shown, `LIMIT 100` unless the user names a number, funnel steps in the order listed, `FORK` for steps with their own filter) and gets the stored query at that position, so edits modify it instead of starting over. When the panel ends up with several queries the generator is also told that each one feeds one part of the template. The builder throws, with the reason, when no query is produced. A new panel with no data must therefore be declared static (`removeAllQueries: true`) rather than sent through generation.

Then it writes the template with the template resolver, but only when there is something to write: a new panel, a prompt, or a query that changed. An edit with no prompt that keeps the query keeps its template and makes no model call. An edit that only replaces or removes the query writes the template again, with an empty prompt, so it reads the columns the new query returns.

Each tool validates its own input at its edge, in its own parameter names (the dashboard tool's plan-time rules, `create_visualization`'s checks, the update schema's refines); the builder does not repeat that.

### The shared template resolver

`createCustomContentTemplateResolver` (`@kbn/custom-content-server`) is what the builder calls to write the template. It picks one of two system prompts:

- **Static HTML** — no query involved; produces a self-contained HTML document.
- **Liquid template** — a query is present or changing; produces a reusable template with no literal data baked in.

It takes all the panel's queries as one list (`esqlQueries`: the first is `rows`, the others `queries[1]`, `queries[2]`, ...) and which of them are new or changing (`changedQueries`, one flag per position; only those are run to sample their columns). A panel with no queries gets the static prompt.

When a query is changing it samples 3 rows (`appendLimitToQuery`) to give the LLM the real schema and representative values. A query that refers to a dashboard control (`?name`) is generated and sampled with that control's value, since an unbound parameter is an error: `custom_content_update_panel` uses the values the panel was sent with, and the dashboard generation tool reads them from the dashboard's saved ES|QL controls, pinned or in the grid (a control in a section applies only to panels in that section). Like the live control, a control with static values passes numeric-looking options as numbers, and one whose values come from a query casts them by the column type its query returns (found once, only when a query being generated or sampled uses that control's variable, by running the control's query with `LIMIT 0` over the dashboard's time range; guessed from the value, like the live control does, if that fails). `create_visualization` has no control values to pass. When only the prompt changes, it skips sampling and asks the LLM to refine the existing template in place, preserving layout and colors. Output is stripped of markdown fences and validated before it is returned.

**A sampling failure fails the resolve.** The sample is the only source of real column names, so a template generated after it fails references invented columns whatever the cause — and persisting that yields a panel that breaks at render with no explanation. Failing instead gives the caller something it can act on. The error message distinguishes the cause so the agent does not act on the wrong one:

| Cause | Message |
|-------|---------|
| `verification_exception` / `parsing_exception` | Query is invalid. A supplied query is corrected (or the user is asked for a valid one); a generated one is retried with a more specific description or an exact index. The message is the same for every flow and does not suggest omitting the query, because on an edit that would keep the stored query. ES\|QL reports a missing index as `verification_exception`, so this covers unknown indices too. |
| `security_exception` | No access to the targeted index. |
| anything else | Could not sample the schema; likely transient, retry. |

A valid query that matches no rows is **not** a failure — Elasticsearch returns the real columns with empty values, and the template is generated with a "no rows available for the current time range" note.

Callers already surface this: the dashboard generation tool records a failure and skips the panel (on an edit, the existing panel is left untouched), and `custom_content_update_panel` returns an error result. The dashboard skill instructs the agent to explain each `data.failures` entry to the user.

## Security

Templates are rendered inside a sandboxed `<iframe sandbox="">` with a strict CSP meta tag (`default-src 'none'; style-src 'unsafe-inline'`). JavaScript cannot execute inside a rendered panel regardless of template content, and the CSP blocks all outbound network requests, so external scripts, fonts, and images cannot load either. `DOMPurify` sanitizes the HTML before injection as an additional layer and strips `<a>` tags.

LLM-generated templates are validated server-side before storage — any output matching `CUSTOM_CONTENT_SCRIPT_PATTERN` or exceeding `CUSTOM_CONTENT_MAX_TEMPLATE_BYTES` is rejected. Prompt, query, and template lengths are bounded by the schemas in `@kbn/custom-content-common`, and the LiquidJS renderer is configured with render, parse, and memory limits.

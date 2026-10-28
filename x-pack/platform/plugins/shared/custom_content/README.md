# custom_content

A Kibana dashboard embeddable that renders AI-generated or hand-authored HTML panels, optionally backed by a live ES|QL query.

> **Technical preview** — custom panels are in technical preview and may change or be removed in a future release.

## Overview

A `custom_content` panel stores two pieces of state (both optional) alongside the standard panel titles:

| Field | Type | Purpose |
|-------|------|---------|
| `esql_query` | `string[] \| undefined` | Optional ES\|QL queries whose results are injected into the template at render time. The first is the panel's main query (`rows`); up to five are allowed (`CUSTOM_CONTENT_MAX_ESQL_QUERIES`) and the rest are read by position as `queries[n]`. Read and write it via `readEsqlQuery` / `readAdditionalEsqlQueries` / `toEsqlQueryState`. The flyout edits all of them; the agent tools still work with the first query and keep the others as they are |
| `template` | `string \| undefined` | LiquidJS HTML template — the actual rendered content |

Panels are saved as part of the dashboard's serialized state (standard embeddable contract, `server/embeddable/schemas.ts`). No separate saved object is created. Both `template` and `esql_query` participate in unsaved-change detection (`esql_query` compares with `deepEquality`, since a fresh array would otherwise look changed on every serialize).

The template is the source of truth for what renders. It is either generated server-side (agent builder, or "Generate with chat" from the flyout) or hand-authored in the flyout's editor. Nothing is regenerated at render time.

### Shared packages

| Package | Contents |
|---------|----------|
| `@kbn/custom-content-common` | Constants (embeddable type, size limits, CSP meta), the zod state schema, the chat tool's update schema (`customContentPanelUpdateSchema`), `resolveCustomContentQuery`, `stripMarkdownFences` |
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
- `dataViews$` — an ad-hoc data view derived from the ES|QL query (`getESQLAdHocDataview`), which is what gives the KQL bar and filter builder field suggestions for this panel.

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
- Add or change the ES|QL query, with a live data preview (`EsqlPreviewSection`)
- Add up to four more queries (`EsqlDataSection`). With more than one, each query gets a tab (`UnifiedTabs`, configured like Lens's layer tabs: no close, rename or reorder) with its own editor and data preview; the first query is `rows` in the template and the others are `queries[1]`, `queries[2]`, … in tab order. Other queries are removed from their tab's menu; the first query cannot be removed. An empty one is dropped on save, and extra queries need the first query to exist. "Run Preview" fetches every query, and a failure is shown above the tabs
- Hand off to the AI chat sidebar with the current draft attached — labelled "Refine with chat" when a template already exists and "Generate with chat" when the editor is empty, and shown only when `agentBuilder` is available

"Run Preview" renders the current draft into the panel without saving, and is enabled only while there are unpreviewed changes. "Apply and close" is enabled only when the template or the query has changed from the saved state.

## Agent builder integration

When `agentBuilder` is available (optional plugin dependency), the panel participates in two ways.

### 1. Refine an existing panel via chat

"Refine with chat" attaches the current template, query, panel title, and panel id as a `platform.custom_content.panel_context` attachment and opens the chat sidebar. The `embeddable_id` field identifies which panel on the dashboard owns the attachment.

The conversation is the ordinary dashboard chat — panels are not given their own chat session. Isolation comes from the attachment rather than the conversation: each panel gets a stable attachment id (`platform.custom_content.panel_context-<embeddableId>`, see `utils/chat_integration.ts`) so re-pushing a panel's context replaces its previous snapshot instead of accumulating duplicates, and every consumer keys off `embeddable_id`. A single round can therefore carry the dashboard attachment plus one attachment per custom content panel, and each panel picks out its own.

The attachment type is registered server-side in `server/attachment_types/custom_content_context.ts` and client-side in `public/attachment_types/custom_content_context.ts`.

A server-side builtin tool, `custom_content_update_panel` (`server/tools/update_custom_content_tool.ts`), accepts `embeddable_id` plus `prompt` and/or `esqlQuery`, and optionally `regenerateEsql` and `index` — never a `template`. It resolves a new template via the shared resolver, merges the result into that panel's attachment, and updates it with `actor: agent`. The embeddable subscribes to `RoundCompleteEvent` and scans every agent-authored create/update ref in the round for a `platform.custom_content.panel_context` attachment whose `embeddable_id` matches its own uuid, then applies that template and query. It scans all refs rather than only the first, because a round routinely touches the dashboard attachment and other panels' attachments too.

Passing `esqlQuery: null` removes the query entirely. `regenerateEsql: true` (it needs a `prompt`) regenerates the query on the server from the prompt, seeded with the stored query so the parts the request does not change are kept; without it, an edit keeps the stored query, so a style-only edit never pays for query generation or schema sampling. An explicit `esqlQuery` always wins.

#### Targeting the right panel

`embeddable_id` is **required**. One conversation can hold a context attachment per panel, so without an explicit target the tool would act on whichever panel was attached first — refining a second panel would silently edit the first. The id is surfaced to the agent in each attachment's text representation (`Custom content panel (embeddable_id: …)`, see `formatPanelContext`) and echoed in `getAgentDescription()`.

This is why the tool's schema, `customContentPanelUpdateSchema` (`@kbn/custom-content-common`), carries `embeddable_id` alongside `prompt` and `esqlQuery`, with an "at least one of prompt or esqlQuery" rule, plus a rule that `regenerateEsql` needs a `prompt`. The dashboard generation tool does not need an identifier in its input: it targets panels by their id in `panels`.

#### Panels that are not attached

Only panels the user explicitly sent to chat via "Refine with chat" have a context attachment. Asking a fresh conversation to update some other custom content panel therefore misses, even though the panel is visible on the dashboard.

That is recoverable rather than fatal: the dashboard attachment is added automatically for a new conversation (`dashboard_app_integration.ts`), and `generate_dashboard` edits a panel listed by id in `panels` with `source: "request"`, `renderer: "custom_content"` content, needing no context attachment at all. Both the tool description and the not-found error therefore name `platform.dashboard.generate_dashboard` as the route to take, alongside the ids that *are* attached. Without that the agent dead-ends and invents its own remediation — in practice, asking the user to click the panel, which attaches nothing.

Two consequences worth knowing. The fallback applies the change through `api.setState(...)`, a whole-dashboard state replace, rather than the targeted `template$`/`esqlQuery$` update the attachment route uses. And the tool id is inlined as a string constant rather than imported from `@kbn/agent-builder-dashboards-common`, to avoid a plugin dependency for prompt copy — it needs keeping in sync with `dashboardTools.generateDashboard`.

#### Preview and version history

The tool returns `attachment_id` and `version`, and both the tool description and the attachment's `getAgentDescription()` instruct the agent to emit `<render_attachment id="…" version="…" />` in its answer. That tag is what renders the attachment card for the round; the panel update itself is applied independently via `RoundCompleteEvent`, so a round without the tag still updates the panel, it just doesn't offer a card to preview from.

The card carries a single **Preview** action (`public/attachment_types/custom_content_context.ts`), which applies that card's version to the live panel — the same in-place state swap the dashboard attachment performs, not a separate preview container. The definition deliberately provides neither `renderInlineContent` nor `renderCanvasContent`, since either would make agent builder open its canvas flyout instead.

Because each round's card is pinned to the version that round produced, clicking Preview on an earlier round steps the panel back to that template, and clicking a later one steps it forward. The button reaches the panel through a small `embeddableId → handler` registry (`utils/panel_preview_registry.ts`) that mounted panels register into; when the panel is not mounted the action warns instead of failing silently. The handler is lazy-loaded so the registry and its copy stay out of the plugin's page-load bundle.

### 2. Agent-driven dashboard creation and editing

The dashboard generation tool in `agent_builder_dashboards` treats custom content as a generated panel, like Lens and Vega: `source: "request"` with `renderer: "custom_content"` (schemas in `.../dashboard-agent-authoring/src/panels/custom_content/index.ts`). The agent supplies `query` (what to display, or what to change), `hasData` (required when adding a panel), and optionally `index`, `esql` and, on edits, `regenerateESQL`; it never supplies `template`. The server generates the template in `.../resolvers/custom_content_panel_resolver.ts`, in the same parallel phase as the tool's other generated panels.

A static panel has no query: a new panel must state `hasData` (there is no default): `false` is static, so a banner never gets a stray `ROW` query, and omitting it is a validation error, so a panel that should show data can't silently be generated with no data and invented numbers. With `hasData: true` the server generates the query from `query` (and `index`). On an edit, omitting `esql` keeps the current query, `null` or `hasData: false` removes it, `hasData: true` gives a static panel a query, and `regenerateESQL: true` regenerates it from the current one. The visualization tool (`create_visualization` with `target.type: "custom_content"`) uses the same vocabulary as `has_data` / `regenerate_esql`.

An edit targets a panel by its id in `panels`, so this path can reach any custom content panel on the dashboard whether or not it has a chat attachment. That makes it the fallback described above.

### Panels with several queries

The agent can create and change a panel's additional queries (see [Datasets](#datasets-asking-for-several-queries)), and works on panels that have them without losing them:

- The context attachment carries them as `additional_esql_queries` and its text lists each one with the name the template reads it by (`queries[1]`, …). The chat card renders them, and an applied update, including `Preview` on an earlier version, puts them back on the panel.
- `custom_content_update_panel` and the dashboard generation tool keep them through an edit. They are dropped with the main query when that is removed, because they have nothing to extend.
- The template resolver samples each additional query on every refinement and adds `queries[n]` guidance to the Liquid system prompt, only for panels that have them, so a restyle does not drop or mangle a section that reads `queries[1]`. A failed sample names the query (`Query 2 (queries[1]): …`) and fails the whole resolve, like the main query.
- "Generate with chat" and "Refine with chat" from the flyout send every query of the draft.

#### Datasets: asking for several queries

`custom_content_update_panel` and the dashboard generation tool take `datasets`, a list of the panel's queries by position. The template reads the first as `rows` and the n-th as `queries[n].rows`. An entry has a `description` (what ONE query returns, in words: the server generates the ES|QL), or an `esql` the user supplied verbatim, plus an optional `index`. It replaces `esql` / `hasData` / `regenerateESQL` / `index` (the single-query fields), and the layout and how each query is used stay in `query` / `prompt`.

- **New panel:** every entry needs a `description` or an `esql`; the queries are generated in parallel (`resolveCustomContentQueries`, `@kbn/custom-content-common`).
- **Edit:** entries apply to the stored queries by position. `description` regenerates that query, seeded with the stored one so the parts the request does not change survive, `esql` replaces it, `{}` keeps it, and an entry past the stored ones adds one. Queries the list does not reach are kept. Removing a query is not offered: it would shift the `queries[n]` every later one is read by. A dataset with a description, or one that adds a query, needs `query` / `prompt`; an edit that only replaces queries does not.
- Generation uses `generateCustomContentEsql` with `isDataset`, which adds guidance that headline numbers are one row with a column per number and that the query returns only what it was described for, since the panel's other queries cover the rest.
- `create_visualization` (the inline chat card) takes `target.datasets` on the `custom_content` and `attachment` targets, with the same rules. The visualization attachment stores the queries as `esql` plus `additional_esql`, which the chat card renders, "Save to dashboard" and `panels[].content.source: "attachment"` carry over to the dashboard panel's `esql_query`, and the attachment text lists for the agent. `datasets` is rejected for a Lens or Vega attachment, which has one query.

### How a panel's query is resolved

All three flows (dashboard generation tool, `custom_content_update_panel`, and `create_visualization`) decide a panel's final query with `resolveCustomContentQuery` (`@kbn/custom-content-common`): an explicit query wins, `has_data: false` or `null` removes it, a new panel generates one unless it is declared static, and an edit keeps the stored query unless it is replaced, removed or regenerated. It also reports whether the query changed, which is what lets the template resolver skip schema sampling for unchanged queries.

Generation goes through `generateCustomContentEsql` (`@kbn/agent-builder-visualizations-server`), a wrapper around the shared visualization generator with custom content instructions: one row per item shown, `LIMIT 100` unless the user names a number, funnel steps in the order listed. The stored query is passed as `existingQueries` so edits modify it instead of starting over. The generator always returns a query or throws, so a request with no data in it must be declared static (`hasData: false`, which new panels always state) rather than sent through generation.

### The shared template resolver

`createCustomContentTemplateResolver` (`@kbn/custom-content-server`) backs both the panel update tool and the dashboard generation tool. It picks one of two system prompts:

- **Static HTML** — no query involved; produces a self-contained HTML document.
- **Liquid template** — a query is present or changing; produces a reusable template with no literal data baked in.

When a query is changing it samples 3 rows (`appendLimitToQuery`) to give the LLM the real schema and representative values. When only the prompt changes, it skips sampling and asks the LLM to refine the existing template in place, preserving layout and colors. Output is stripped of markdown fences and validated before it is returned.

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

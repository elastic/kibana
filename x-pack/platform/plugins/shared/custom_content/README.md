# custom_content

A Kibana dashboard embeddable that renders AI-generated or hand-authored HTML panels, optionally backed by a live ES|QL query.

> **Technical preview** — custom panels are in technical preview and may change or be removed in a future release.

## Overview

A `custom_content` panel stores two pieces of state (both optional) alongside the standard panel titles:

| Field | Type | Purpose |
|-------|------|---------|
| `esql_query` | `string[] \| undefined` | Optional ES\|QL query whose results are injected into the template at render time. An array so the shape can hold several queries later without a migration, capped at one for now — read and write it via `readEsqlQuery` / `toEsqlQueryState` |
| `template` | `string \| undefined` | LiquidJS HTML template — the actual rendered content |

Panels are saved as part of the dashboard's serialized state (standard embeddable contract, `server/embeddable/schemas.ts`). No separate saved object is created. Both `template` and `esql_query` participate in unsaved-change detection (`esql_query` compares with `deepEquality`, since a fresh array would otherwise look changed on every serialize).

The template is the source of truth for what renders. It is either generated server-side (agent builder, or "Generate with chat" from the flyout) or hand-authored in the flyout's editor. Nothing is regenerated at render time.

### Shared packages

| Package | Contents |
|---------|----------|
| `@kbn/custom-content-common` | Constants (embeddable type, size limits, CSP meta), the zod state schema, the two update schemas (`customContentUpdateSchema` for the dashboard tool, `customContentPanelUpdateSchema` for the chat tool), `stripMarkdownFences` |
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
- Hand off to the AI chat sidebar with the current draft attached — labelled "Refine with chat" when a template already exists and "Generate with chat" when the editor is empty, and shown only when `agentBuilder` is available

"Run Preview" renders the current draft into the panel without saving, and is enabled only while there are unpreviewed changes. "Apply and close" is enabled only when the template or the query has changed from the saved state.

## Agent builder integration

When `agentBuilder` is available (optional plugin dependency), the panel participates in two ways.

### 1. Refine an existing panel via chat

"Refine with chat" attaches the current template, query, panel title, and panel id as a `platform.custom_content.panel_context` attachment and opens the chat sidebar. The `embeddable_id` field identifies which panel on the dashboard owns the attachment.

The conversation is the ordinary dashboard chat — panels are not given their own chat session. Isolation comes from the attachment rather than the conversation: each panel gets a stable attachment id (`platform.custom_content.panel_context-<embeddableId>`, see `utils/chat_integration.ts`) so re-pushing a panel's context replaces its previous snapshot instead of accumulating duplicates, and every consumer keys off `embeddable_id`. A single round can therefore carry the dashboard attachment plus one attachment per custom content panel, and each panel picks out its own.

The attachment type is registered server-side in `server/attachment_types/custom_content_context.ts` and client-side in `public/attachment_types/custom_content_context.ts`.

A server-side builtin tool, `custom_content_update_panel` (`server/tools/update_custom_content_tool.ts`), accepts `embeddable_id` plus `prompt` and/or `esqlQuery` — never a `template`. It resolves a new template via the shared resolver, merges the result into that panel's attachment, and updates it with `actor: agent`. The embeddable subscribes to `RoundCompleteEvent` and scans every agent-authored create/update ref in the round for a `platform.custom_content.panel_context` attachment whose `embeddable_id` matches its own uuid, then applies that template and query. It scans all refs rather than only the first, because a round routinely touches the dashboard attachment and other panels' attachments too.

Passing `esqlQuery: null` removes the query entirely.

#### Targeting the right panel

`embeddable_id` is **required**. One conversation can hold a context attachment per panel, so without an explicit target the tool would act on whichever panel was attached first — refining a second panel would silently edit the first. The id is surfaced to the agent in each attachment's text representation (`Custom content panel (embeddable_id: …)`, see `formatPanelContext`) and echoed in `getAgentDescription()`.

This is why the tool takes `customContentPanelUpdateSchema` rather than `customContentUpdateSchema` (`@kbn/custom-content-common`). The two share their field definitions and their "at least one of prompt or esqlQuery" rule, but only the chat variant carries an identifier — the dashboard generation tool already targets by `panelId`, and a second identifier in its config would be redundant and unfillable.

#### Panels that are not attached

Only panels the user explicitly sent to chat via "Refine with chat" have a context attachment. Asking a fresh conversation to update some other custom content panel therefore misses, even though the panel is visible on the dashboard.

That is recoverable rather than fatal: the dashboard attachment is added automatically for a new conversation (`dashboard_app_integration.ts`), and `edit_panels` accepts `type: "custom_content"` targeting by `panelId`, needing no context attachment at all. Both the tool description and the not-found error therefore name `platform.dashboard.generate_dashboard` as the route to take, alongside the ids that *are* attached. Without that the agent dead-ends and invents its own remediation — in practice, asking the user to click the panel, which attaches nothing.

Two consequences worth knowing. The fallback applies the change through `api.setState(...)`, a whole-dashboard state replace, rather than the targeted `template$`/`esqlQuery$` update the attachment route uses. And the tool id is inlined as a string constant rather than imported from `@kbn/agent-builder-dashboards-common`, to avoid a plugin dependency for prompt copy — it needs keeping in sync with `dashboardTools.generateDashboard`.

#### Preview and version history

The tool returns `attachment_id` and `version`, and both the tool description and the attachment's `getAgentDescription()` instruct the agent to emit `<render_attachment id="…" version="…" />` in its answer. That tag is what renders the attachment card for the round; the panel update itself is applied independently via `RoundCompleteEvent`, so a round without the tag still updates the panel, it just doesn't offer a card to preview from.

The card carries a single **Preview** action (`public/attachment_types/custom_content_context.ts`), which applies that card's version to the live panel — the same in-place state swap the dashboard attachment performs, not a separate preview container. The definition deliberately provides neither `renderInlineContent` nor `renderCanvasContent`, since either would make agent builder open its canvas flyout instead.

Because each round's card is pinned to the version that round produced, clicking Preview on an earlier round steps the panel back to that template, and clicking a later one steps it forward. The button reaches the panel through a small `embeddableId → handler` registry (`utils/panel_preview_registry.ts`) that mounted panels register into; when the panel is not mounted the action warns instead of failing silently. The handler is lazy-loaded so the registry and its copy stay out of the plugin's page-load bundle.

### 2. Agent-driven dashboard creation and editing

`agent_builder_dashboards` registers a `custom_content` panel type for its dashboard generation tool (`.../operations/panels/custom_content/index.ts`). Both the create and edit schemas omit `template` — the agent supplies only `prompt` and optionally `esqlQuery`, and the server generates the template.

The edit variant reuses `customContentUpdateSchema` and adds its own `panelId`, so this path can reach any custom content panel on the dashboard whether or not it has a chat attachment. That makes it the fallback described above.

### The shared template resolver

`createCustomContentTemplateResolver` (`@kbn/custom-content-server`) backs both the panel update tool and the dashboard generation tool. It picks one of two system prompts:

- **Static HTML** — no query involved; produces a self-contained HTML document.
- **Liquid template** — a query is present or changing; produces a reusable template with no literal data baked in.

When a query is changing it samples 3 rows (`appendLimitToQuery`) to give the LLM the real schema and representative values. When only the prompt changes, it skips sampling and asks the LLM to refine the existing template in place, preserving layout and colors. Output is stripped of markdown fences and validated before it is returned.

**A sampling failure fails the resolve.** The sample is the only source of real column names, so a template generated after it fails references invented columns whatever the cause — and persisting that yields a panel that breaks at render with no explanation. Failing instead gives the caller something it can act on. The error message distinguishes the cause so the agent does not act on the wrong one:

| Cause | Message |
|-------|---------|
| `verification_exception` / `parsing_exception` | Query is invalid; build it with `generate_esql` and retry. ES\|QL reports a missing index as `verification_exception`, so this covers unknown indices too. |
| `security_exception` | No access to the targeted index. |
| anything else | Could not sample the schema; likely transient, retry. |

A valid query that matches no rows is **not** a failure — Elasticsearch returns the real columns with empty values, and the template is generated with a "no rows available for the current time range" note.

Callers already surface this: `applyCustomContentTemplates` drops the panel and records a failure, `edit_panels` records a failure and leaves the existing panel untouched, and `custom_content_update_panel` returns an error result. The dashboard skill instructs the agent to explain each `data.failures` entry to the user.

## Security

Templates are rendered inside a sandboxed `<iframe sandbox="">` with a strict CSP meta tag (`default-src 'none'; style-src 'unsafe-inline'`). JavaScript cannot execute inside a rendered panel regardless of template content, and the CSP blocks all outbound network requests, so external scripts, fonts, and images cannot load either. `DOMPurify` sanitizes the HTML before injection as an additional layer and strips `<a>` tags.

LLM-generated templates are validated server-side before storage — any output matching `CUSTOM_CONTENT_SCRIPT_PATTERN` or exceeding `CUSTOM_CONTENT_MAX_TEMPLATE_BYTES` is rejected. Prompt, query, and template lengths are bounded by the schemas in `@kbn/custom-content-common`, and the LiquidJS renderer is configured with render, parse, and memory limits.

# custom_content

A Kibana dashboard embeddable that renders AI-generated or hand-authored HTML panels, optionally backed by a live ES|QL query.

> **Technical preview** — custom panels are in technical preview and may change or be removed in a future release.

During active development the plugin is additionally gated behind the `dashboard.customContent.enabled` feature flag.

## Overview

A `custom_content` panel stores three pieces of state:

| Field | Type | Purpose |
|-------|------|---------|
| `prompt` | `string` | Natural-language description used to generate the template |
| `esqlQuery` | `string \| undefined` | Optional ES|QL query whose results are injected into the template at render time |
| `template` | `string \| undefined` | LiquidJS HTML template — the actual rendered content |

Panels are saved as part of the dashboard's serialized state (standard embeddable contract). No separate saved object is created.

The template is generated server-side once (either via the agent builder or the edit flyout) and stored alongside the prompt. Switching between attachment versions restores the exact template that existed at that point.

## Rendering paths

`use_custom_content_html.ts` picks one of two paths on every render cycle:

```
template only (no query)
  └─ sanitize + inject theme CSS → render immediately, no network call

template + esqlQuery
  └─ fetchEsqlData(query, timeRange)
     └─ fillTemplate(template, columns, rows) → LiquidJS render → display
```

Both paths bypass the LLM entirely at render time. Template generation happens once at creation or edit time, not on every render.

Theme CSS custom properties (`--cc-color-text`, `--cc-color-surface`, etc.) are injected client-side via `useEuiTheme()` so dark mode works correctly, including when `theme: darkMode` is set to `'system'`. Changing the theme updates the CSS without re-fetching ES|QL data.

## Template syntax

Templates use [LiquidJS](https://liquidjs.com/) syntax. Column values are accessed as:

```html
{{ row["column_name"].value }}
```

JavaScript is explicitly blocked — the iframe sandbox, a strict CSP, and `DOMPurify` all independently prevent script execution.

## Edit flyout

Opening the panel context menu → Edit renders `EditCustomContentFlyout`, which lets users:

- Edit the LiquidJS template directly in a Monaco editor (Liquid language mode)
- Add or change the ES|QL query, with live data preview
- Launch the AI chat sidebar pre-loaded with the panel context ("Generate with chat", visible only when `agentBuilder` is available)

"Apply and close" is enabled only when either the template or the query has changed from the saved state.

## Agent builder integration

When `agentBuilder` is available (optional plugin dependency), the panel participates in two ways:

### 1. Refine via chat

"Refine with chat" in the flyout attaches the current template, query, and panel ID as a `platform.custom_content.panel_context` attachment and opens the AI chat sidebar. The attachment includes an `embeddable_id` field that identifies which panel on the dashboard owns the session.

A server-side builtin tool (`custom_content_update_panel`) is registered in `server/tools/update_custom_content_tool.ts`. When the LLM calls it, the tool validates the template (rejects `<script>` tags and oversized output), merges the new values with the stored attachment, and updates it with `actor: agent`. The embeddable subscribes to `RoundCompleteEvent` and applies the update when it sees an agent-authored change to its own attachment (matched by `embeddable_id`).

The attachment type is registered server-side in `server/attachment_types/custom_content_context.ts` and client-side in `public/attachment_types/custom_content_context.ts`. The session is scoped per panel via a tag (`custom_content-<embeddableId>`), so concurrent panels don't share chat context.

### 2. Agent-driven dashboard creation and editing

Template generation for agent-driven operations (create panel, edit panel) happens in `agent_builder_dashboards` via `custom_content_resolver.ts`. The resolver fetches a sample of ES|QL rows, builds a system prompt, calls the LLM, and validates the output (rejects `<script>` tags and oversized responses) before storing the template in the attachment state.

## Security

Templates are rendered inside a sandboxed `<iframe sandbox="">` with a strict CSP meta tag (`default-src 'none'; style-src 'unsafe-inline'`). JavaScript cannot execute inside a rendered panel regardless of template content. `DOMPurify` sanitizes the HTML before injection as an additional layer. LLM-generated templates are validated server-side before storage — any output containing a `<script>` tag or exceeding the byte limit is rejected.

## Feature flag

A temporary kill-switch (`dashboard.customContent.enabled`) gates the plugin during active development. When `false`, the plugin short-circuits and no embeddable is registered. The flag will be removed once the feature is ready to ship.

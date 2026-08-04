# custom_content

A Kibana dashboard embeddable that renders AI-generated or hand-authored HTML panels, optionally backed by a live ES|QL query.

> **Technical preview** — custom panels are in technical preview and may change or be removed in a future release.

During active development the plugin is additionally gated behind the `dashboard.customContent.enabled` feature flag.

## Overview

A `custom_content` panel stores three pieces of state:

| Field | Type | Purpose |
|-------|------|---------|
| `prompt` | `string` | Natural-language description used to generate the initial template |
| `esqlQuery` | `string \| undefined` | Optional ES|QL query whose results are injected into the template at render time |
| `template` | `string \| undefined` | LiquidJS HTML template — the actual rendered content |

Panels are saved as part of the dashboard's serialized state (standard embeddable contract). No separate saved object is created.

## Rendering paths

`use_custom_content_html.ts` picks one of three paths on every render cycle:

```
template only (no query)
  └─ prepareHtml(template) → render immediately, no network call

template + esqlQuery
  └─ fetchEsqlData(query, timeRange)
     └─ fillTemplate(template, columns, rows) → LiquidJS render → display

prompt only (no template yet)
  └─ POST /internal/custom_content/generate (streaming SSE)
     └─ LLM streams HTML/LiquidJS tokens
        └─ validate → fetchEsqlData (if query) → fillTemplate → cache as template
```

The fast paths (first two) bypass the LLM entirely. The LLM path runs once per prompt, writes the resulting template back into state via `onTemplateChange`, and subsequent renders use the fast path until the query or prompt changes.

An echo-skip guard (`selfWrittenRef`) prevents the `onTemplateChange` write-back from triggering a redundant re-render of the same effect.

## Template syntax

Templates use [LiquidJS](https://liquidjs.com/) syntax. Column values are accessed as:

```html
{{ row["column_name"].value }}
```

JavaScript is explicitly blocked — `prepare_html.ts` strips `<script>` tags and rejects templates that contain script content before rendering or caching them.

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

A server-side builtin tool (`custom_content_update_panel`) is registered in `server/tools/update_custom_content_tool.ts`. When the LLM calls it, the tool validates the template (rejects `<script>` tags), merges the new values with the stored attachment, and updates it with `actor: agent`. The embeddable subscribes to `RoundCompleteEvent` and applies the update when it sees an agent-authored change to its own attachment (matched by `embeddable_id`).

The attachment type is registered server-side in `server/attachment_types/custom_content_context.ts` and client-side in `public/attachment_types/custom_content_context.ts`. The session is scoped per panel via a tag (`custom_content-<embeddableId>`), so concurrent panels don't share chat context.

### 2. Agent-driven dashboard updates

`agent_builder_dashboards` applies LLM-driven layout changes on round completion via `agentLiveUpdatesSubscription`. To prevent the dashboard's own ambient state sync from reverting agent changes (e.g., vivid-color edits applied by the LLM being overwritten on the next round-complete event), the subscription filters incoming attachment refs to only those with `actor === ATTACHMENT_REF_ACTOR.agent`. User-originated refs are skipped.

## Server: generate route

`POST /internal/custom_content/generate` accepts `{ prompt, esqlQuery, timeRange, colorMode }` and streams SSE token events back to the client.

When an `esqlQuery` is provided, the server fetches up to `CUSTOM_CONTENT_SAMPLE_ROW_COUNT` rows before calling the LLM and includes the schema and sample data in the user message. This gives the LLM enough context to generate correct `row["column"].value` references without the client sending raw data.

The streaming response is capped at `CUSTOM_CONTENT_MAX_TEMPLATE_BYTES` (UTF-8 bytes). Exceeding the limit aborts the stream and emits a `size_limit_exceeded` error event.

## Security

Templates are rendered inside a sandboxed `<iframe>` with a strict CSP (`default-src 'none'; style-src 'unsafe-inline'`). JavaScript cannot execute inside a rendered panel regardless of template content. `DOMPurify` sanitizes the HTML before injection.

## Feature flag

A temporary kill-switch (`dashboard.customContent.enabled`) gates the plugin during active development. When `false`, the plugin short-circuits in both `plugin.ts` (client) and `generate_route.ts` (server) — no routes are active and no embeddable is registered. The flag will be removed once the feature is ready to ship.


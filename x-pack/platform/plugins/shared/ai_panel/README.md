# AI Panel

A dashboard embeddable that turns a natural-language prompt into a self-contained HTML panel: KPI cards, status boards, mixed text/data layouts, that kind of thing. It's meant as the fallback for content that doesn't fit a Lens chart or a Vega visualization, not a replacement for either. See `ai_panel_authoring_skill.ts` in the `agent_builder_dashboards` plugin for the decision tree the dashboard-generation agent uses to pick between the three.

## How a panel gets rendered

Whether a panel is "static" or "template" mode depends on whether its config has an `esqlQuery`.

**Static** (no query) - the LLM streams back raw HTML and that's rendered as-is every time. Nothing to cache, nothing to invalidate.

**Template** (query set) - the first time the panel generates, the LLM doesn't write HTML, it writes a Liquid template. It gets a schema plus three sample rows for context (fetched server-side, see `runEsqlQuery`), but never the real data. That template is what actually gets saved on the embeddable. Every render after that (time range change, dashboard reload, whatever) just re-runs the ES|QL query client-side and fills the saved template with the live rows - no LLM call involved. Editing the prompt or the query in the edit flyout clears the saved template so it regenerates, since the column schema might not match anymore. Editing the template text directly (in the flyout's advanced accordion) doesn't - it applies immediately.

One thing worth knowing if you're touching the template-fill code: row data is addressed by the exact ES|QL column name, not a normalized version of it. So you write `row["category.keyword"].value` in the template, not `row.category_keyword`. Earlier this collapsed dots and `@` into underscores so templates could use plain dot access, but two differently-named columns can normalize to the same identifier and one would silently overwrite the other. ES|QL already guarantees column names are unique within a single query's results, so keying on the raw name sidesteps the whole problem. `.pct` gives you the value as a percentage of that column's max across all rows; `max["column name"]` gives you the max itself.

## Where things are

- `server/routes/generate_route.ts` - the only HTTP route, `POST /internal/ai_panel/generate`. Streams NDJSON tokens back from the inference plugin and builds a different system prompt depending on static vs. template mode.
- `server/utils/esql_query.ts` - runs the schema-sampling query (10s timeout, deliberately shorter than Kibana's default since it's just context for the prompt, not the real data path) and sanitizes what gets shown to the LLM.
- `public/hooks/use_ai_panel_html.ts` - the actual orchestration: decides fast path (saved template, just re-fetch and fill) vs. slow path (stream a new template while the ES|QL fetch runs in parallel), and writes the result back once both finish.
- `public/utils/template_fill.ts` - the Liquid rendering and the output sanitization pipeline.
- `public/utils/fetch_esql_data.ts` / `stream_generate.ts` - client-side query execution and NDJSON stream parsing.
- `public/ai_panel_embeddable.tsx` - the embeddable factory: state serialization, edit flyout wiring, the logic that decides when to clear a saved template.
- `common/constants.ts` - embeddable type id, the CSP meta tag, prompt/query length limits.

## Output safety

Every panel, static or template-filled, goes through the same pipeline before it reaches the iframe (`prepareHtml`):

1. Strip markdown fences the model added despite being told not to (only near the edges of the response - a broad "strip every fence" pass would also eat a legitimate code example the panel is meant to show).
2. Run it through DOMPurify, forbidding `<a>` on top of DOMPurify's own defaults (`<script>`, `on*` handlers).
3. Inject a `default-src 'none'` CSP meta tag.

The result lands in `<iframe sandbox="">`, no exceptions on the sandbox. Liquid itself is set to `outputEscape: 'escape'`, so live ES|QL data gets HTML-escaped by the template engine before DOMPurify even sees it.

Separately, `sanitizeCellValue` strips `{{`/`{%`/newlines and caps length at 500 characters on column names and sample values before they go into the prompt sent to the LLM. That's not part of the XSS defense above - the rendering pipeline handles that regardless of what's in the prompt - it's there so a hostile or just oversized field can't corrupt the schema shown to the model or eat the token budget.

## A few gotchas

- The 500,000-byte cap on streamed LLM output is measured with `Buffer.byteLength`, not `.length`. A CJK- or emoji-heavy response can be 2-3x its `.length` in actual bytes, so a plain string-length check would let real output size run well past the intended budget.
- Error strings that end up rendered in the panel (no connector configured, size limit hit, generation failed) go through `i18n.translate`, same as client-side strings. `logger.error()` calls stay plain English since those are logs, not something a user sees.
- The light/dark colors baked into the system prompt come from `@kbn/ui-theme`'s `euiLightVars`/`euiDarkVars`, not hand-picked hex values, so they move with the EUI theme instead of quietly going stale.

## Tests

```
node scripts/jest --config x-pack/platform/plugins/shared/ai_panel/jest.config.js
```

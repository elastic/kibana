# Agent Builder Vega Authoring

Domain language for the Agent Builder path that authors Vega-family chart specs from natural language and ES|QL, for chat attachments and dashboard panels.

## Language

**Dialect**:
Which grammar a generated specification uses: Vega-Lite or raw Vega.
_Avoid_: renderer, engine, format (when meaning the grammar)

**Dialect gate**:
The allowlist of Raw Vega chart intents (currently Sunburst, Radar, and Sankey). Selection is performed by a small classifier model call that returns a catalog id or `none`; when `none`, authoring stays within Vega-Lite (unsupported diagrams still get an honest refusal). Chart-type metadata (selection blurbs, curated examples, per-type rules, ES|QL shape instructions, integrity checks) lives in the Lens-style `chart_type_registry` (`chart_types/*` modules, Raw + Vega-Lite).
_Avoid_: model-chosen free-form dialect, keyword-only routing

**Catalog id**:
A stable identifier for a curated Raw Vega chart intent returned by the Dialect gate classifier (e.g. `sunburst`, `radar`, `sankey`), or `none` when no allowlisted intent matches. On Raw Vega edits, catalog is inferred from structural cues in the existing spec, with classifier fallback; unknown catalogs stay `none` (shared Raw rules + existing spec — no guessed catalog).
_Avoid_: chartType (unless referring to the existing Lens/tool enum), renderer

**Canonical ES|QL source**:
The single system-owned ES|QL dataset injected into a Raw Vega spec (named `source`) whose `url` carries `%type%: esql`, `%context%`, and optional `%timefield%`. Nested or extra ES|QL urls the model invents are stripped/rebound during normalize.
_Avoid_: multi-dataset ES|QL, passthrough data array (until a later upgrade)

**Edit Dialect pin**:
On natural-language re-author of an existing visualization, Dialect is taken from the stored spec's `$schema` (Raw Vega stays Raw Vega, Vega-Lite stays Vega-Lite). An explicit ask to change chart family is treated as a new create / recreate, not a silent in-place Dialect flip.
_Avoid_: always re-classify on edit, silent dialect flip

**Dialect-aware validation**:
Headless validation branches on `$schema`: Vega-Lite compiles then parses/runs; Raw Vega skips compile and parses/runs only. Both paths use the expression interpreter, rejecting loader, timeout/heap limits, and empty stubs for every named dataset.
_Avoid_: parse-only validation, always-compile for Raw Vega

**Static diagram**:
A Raw Vega chart without custom signals or Kibana interaction helpers (`kibanaAddFilter`, `kibanaSetTimeFilter`, etc.). Allowlisted catalog charts are Static diagrams (marks, transforms, tooltips only).
_Avoid_: interactive Vega, click-to-filter (for allowlisted charts)

**Parent–child table**:
The hierarchical ES|QL result shape required for Sunburst: flat rows with `id` / `parent` / `name` / `value` that Vega `stratify` can consume. Exactly one root (`parent` null), and every non-null `parent` value must also appear as some row's `id`.
_Avoid_: path column, level1/level2 unpivot, leaf-only tables, multiple roots

**Key/value table**:
The ES|QL result shape required for Radar: rows with `key` / `value` (optional `series`) and enough distinct keys for readable spokes.
_Avoid_: COUNT_DISTINCT(key) while grouping BY the same key (always 1 → empty chart)

**Flow table**:
The ES|QL result shape required for Sankey: rows with `stk1` / `stk2` / `size` (source → destination flows with numeric weight).
_Avoid_: fixed `y` domain `[0, 1]` in the Raw Vega layout (stack totals are real measures)

**Classify-then-query**:
Graph ordering for new visualizations: Dialect gate classifier first, then generate ES|QL with catalog-specific instructions, then (for Vega-Lite) select reference examples, then author/normalize/validate in that Dialect.
_Avoid_: classify in parallel with ES|QL, classify after ES|QL, author before VL reference-example selection finishes

**Disclosed fallback**:
When an allowlisted chart is selected but its required ES|QL table cannot be produced (Parent–child for Sunburst; key/value with enough keys for Radar; stk1/stk2/size flows for Sankey), do not silently claim success: produce the closest Vega-Lite approximation and disclose that the requested chart was not possible.
_Avoid_: silent VL fallback, hard fail with no alternative chart

**Allowlist refusal**:
For Raw Vega diagram intents not yet in the Dialect gate allowlist (network, chord, …), do not author Raw Vega: refuse honestly and offer Vega-Lite / Lens / multi-chart alternatives. Widen the allowlist chart-by-chart via the chart type registry.
_Avoid_: free-form Raw Vega, silent VL substitution for named unsupported diagrams

**Vega-Lite**:
The high-level grammar currently authored by the Agent Builder Vega pipeline (schema pinned to Vega-Lite v6).
_Avoid_: Vega (when meaning only this dialect)

**Raw Vega**:
The low-level Vega grammar (marks, signals, transforms, multi-dataset `data` arrays) used only when Vega-Lite cannot express the chart.
_Avoid_: full Vega, Vega v5 (unless referring to a concrete schema URL), Vega (when meaning the product surface)

**Renderer**:
The Agent Builder `create_visualization` / panel choice between Lens and the Vega-family path (`renderer: "vega"`). Does not distinguish Dialect.
_Avoid_: Dialect, Vega-Lite, raw Vega

**Sunburst / Radar / Sankey**:
Allowlisted Raw Vega chart types: hierarchical radial partition (`stratify` / `partition`); polar multivariate (`linear-closed`); two-stack flow (`linkpath`). Each lives under `chart_types/` with `prompt.selection` / `prompt.config`, a lazy `example`, and colocated row-integrity helpers (`*_integrity.ts`) wired through `chart_type_registry`.
_Avoid_: treating these as free-form Raw Vega or as Lens treemap/pie/donut substitutes unless the user asked for that chart family

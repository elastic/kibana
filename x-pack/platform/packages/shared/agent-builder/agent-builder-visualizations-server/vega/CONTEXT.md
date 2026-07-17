# Agent Builder Vega Authoring

Domain language for the Agent Builder path that authors Vega-family chart specs from natural language and ES|QL, for chat attachments and dashboard panels.

## Language

**Dialect**:
Which grammar a generated specification uses: Vega-Lite or raw Vega.
_Avoid_: renderer, engine, format (when meaning the grammar)

**Dialect gate**:
The allowlist of Raw Vega chart intents (currently Sunburst and Radar). Selection is performed by a small classifier model call that returns a catalog id or `none`; when `none`, authoring stays within Vega-Lite (unsupported diagrams still get an honest refusal).
_Avoid_: model-chosen free-form dialect, keyword-only routing

**Catalog id**:
A stable identifier for a curated Raw Vega (or later shared) chart intent returned by the Dialect gate classifier (e.g. `sunburst`, `radar`), or `none` when no allowlisted intent matches.
_Avoid_: chartType (unless referring to the existing Lens/tool enum), renderer

**Canonical ES|QL source**:
The single system-owned ES|QL dataset injected into a Raw Vega spec (named, e.g. `source`) whose `url` carries `%type%: esql`, `%context%`, and optional `%timefield%`. Nested or extra ES|QL urls the model invents are not kept in the Vertical slice.
_Avoid_: multi-dataset ES|QL, passthrough data array (until a later upgrade)

**Edit Dialect pin**:
On natural-language re-author of an existing visualization, Dialect is taken from the stored spec's `$schema` (Raw Vega stays Raw Vega, Vega-Lite stays Vega-Lite). An explicit ask to change chart family is treated as a new create / recreate, not a silent in-place Dialect flip.
_Avoid_: always re-classify on edit, silent dialect flip

**Dialect-aware validation**:
Headless validation branches on `$schema`: Vega-Lite compiles then parses/runs; Raw Vega skips compile and parses/runs only. Both paths use the expression interpreter, rejecting loader, timeout/heap limits, and empty stubs for every named dataset.
_Avoid_: parse-only validation, always-compile for Raw Vega

**Static diagram**:
A Raw Vega chart without custom signals or Kibana interaction helpers (`kibanaAddFilter`, `kibanaSetTimeFilter`, etc.). The Sunburst Vertical slice is a Static diagram (marks, transforms, tooltips only).
_Avoid_: interactive Vega, click-to-filter (for this slice)

**Parent–child table**:
The only hierarchical ES|QL result shape supported for Sunburst in the Vertical slice: flat rows with `id` / `parent` / `name` / `value` that Vega `stratify` can consume. Exactly one root (`parent` null), and every non-null `parent` value must also appear as some row's `id`.
_Avoid_: path column, level1/level2 unpivot, leaf-only tables, multiple roots

**Classify-then-query**:
Graph ordering for new visualizations: run the Dialect gate classifier first, then generate ES|QL with catalog-specific instructions (e.g. Parent–child table for Sunburst), then author/normalize/validate in that Dialect.
_Avoid_: classify in parallel with ES|QL, classify after ES|QL

**Disclosed fallback**:
When an allowlisted chart is selected but its required ES|QL table cannot be produced (Parent–child for Sunburst; key/value with ≥3 keys for Radar), do not silently claim success: produce the closest Vega-Lite approximation and disclose that the requested chart was not possible.
_Avoid_: silent VL fallback, hard fail with no alternative chart

**Allowlist refusal**:
For Raw Vega diagram intents not yet in the Dialect gate allowlist (Sankey, network, chord, …), do not author Raw Vega: refuse honestly and offer Vega-Lite / Lens / multi-chart alternatives. Widen the allowlist chart-by-chart.
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

**Vertical slice**:
The first shippable unit of raw-Vega support: dual-Dialect plumbing plus one curated chart that proves generate → normalize → validate → render → edit end-to-end.
_Avoid_: full catalog, MVP (when meaning all raw-Vega charts)

**Sunburst chart**:
The Vertical-slice Raw Vega chart: a hierarchical radial partition visualization authored with Vega `stratify` / `partition` transforms (not expressible as Vega-Lite).
_Avoid_: treemap (Lens), pie, donut (when meaning this hierarchy)

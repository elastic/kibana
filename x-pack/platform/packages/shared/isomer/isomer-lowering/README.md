# @kbn/isomer-lowering

Browser-compatible, single-Lens lowering **before chart binding**. This package
has no Studio, Isomer engine, plugin, Elasticsearch client, or rendering dependency.

`lowerLens({ savedObject, dataViews? })` accepts a persisted Lens saved-object
envelope (`id`, `type`, `attributes`, `references`). It returns a discriminated
`planned`, `invalid`, or `unsupported` outcome. Invalid and unsupported outcomes
carry diagnostic codes, messages and input paths, never a partial executable plan.

A version-1 plan is JSON serializable. It preserves the validated Lens source
(including presentation state), all native ES|QL layers, Lens column IDs, labels,
formats and ES|QL response names. It is **not** the demo's chart-specific
AdaptiveLens model, an Isomer declaration, or a renderable primitive. A planned
query says nothing about whether a future chart binder supports the visualization.

## Execution and response boundary

The host executes each `plan.queries` entry separately, associating its response
with the entry's `layerId`. ES|QL is preserved byte for byte, not parsed, optimized,
authorized, or rewritten. The host must authorize execution and apply its
execution-time filters and time range using Lens ES|QL semantics. The query
context records `ignoreGlobalFilters` (which does not suppress the time range)
and the layer's explicit time field; no `@timestamp` fallback is invented and
data-view metadata never rewrites the query. Parameters, transport, cancellation,
timeouts and query error handling belong to the host, not this package.

`readLensResponse(query, response)` accepts a query entry returned by `lowerLens`
and a complete ES|QL `{ columns: [{ name, type }], values: [...] }` response. It
returns a `ready` table in Lens column order, or an `invalid` diagnostic outcome.
Several Lens columns may map to one ES|QL field. Missing/ambiguous response
columns, ragged rows and partial/running responses are refused. Nulls, multivalued
cells and response types are preserved; empty results stay empty. No formatting,
type coercion, date-histogram adjustment, sorting or chart binding occurs.

```ts
import { lowerLens, readLensResponse } from '@kbn/isomer-lowering';

const result = lowerLens({ savedObject, dataViews });
if (result.status === 'planned') {
  // The application's existing query service owns execution and context.
  for (const query of result.plan.queries) {
    const response = await executeWithLensContext(query);
    const table = readLensResponse(query, response);
    // Surface invalid outcomes; only ready tables can proceed to future binding.
  }
}
```

## Referenced data views

Supply serializable metadata keyed by data-view `id`, with `title` and optional
`timeFieldName`, `fieldFormats` and `fieldLabels`. Each `index-pattern` reference
is retained by its exact name and ID, along with matching metadata if supplied.
Missing metadata is explicitly absent: native ES|QL can run without a data view
(for example, `ROW value = 1`). Duplicate reference names, duplicate metadata IDs
and metadata for unrelated data views are invalid. No resolver callback, plugin
contract or first-reference heuristic crosses the browser boundary.

## Deliberate limits

Only persisted native `textBased` ES|QL Lens layers are planned. Form-based
aggregations/formulas, mixed/legacy datasources, inline tables, unknown layer
extensions, partial-bucket transforms, saved filters and nonempty global queries
are explicitly unsupported. Visualization state is opaque validated JSON, not a
claim of chart support. The next metric slice must add actual semantic query
planning for ordinary form-based Lens, backed by its semantic fixtures, not by
copying the demo's approximate ES|QL synthesizer. This native-ES|QL intermediate
core does not yet lower ordinary form-based Lens.

Inputs must be finite JSON, at most 20 levels deep, 100,000 values, 2,000,000 total
string/key characters, 100,000 characters per string and 10,000 entries per
array/object. Prototype-related keys and non-JSON values are refused. Additional
schema limits are 16 layers, 512 Lens/response columns, 512 references/data views,
and 10,000 response rows. Limits reject explicitly rather than truncating.

This layer intentionally excludes chart primitives, browser engines, dashboards,
query transport, PNG/PDF and server drawing. It can be prepared from main
independently, but must be restacked onto the accepted Shared Isomer Studio layer
before publishing the sequential PR.

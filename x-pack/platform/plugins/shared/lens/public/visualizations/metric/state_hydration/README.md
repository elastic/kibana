# Metric state hydration

Metric-specific runtime patches to visualization state and datasource layers. Invoked from `applyStateHydration` after the metric type guard.

- `editor` (Lens editor load and save): secondary-label migration, then ES|QL trendline.
- `expression` (dashboard panel render): ES|QL trendline only.

## `esql_trendline.ts`

When a metric sparkline is enabled, rebuilds the hidden ES|QL trendline layer from the main layer (query, time field, metric and breakdown columns).

`hydrateEsqlMetricTrendlineAfterSuggestion` covers dashboard inline ES|QL editing. Suggestions rebuild only the main layer, so trendline accessors are taken from the previous visualization, then the layer is rebuilt from the new query. If the suggestion omits `timeField` but still targets the same index, the previous trendline layer's time field is used. If rebuild still fails on that same index, the previous trendline layer is kept. A suggestion for a different index does not reuse the previous time field or trendline layer.

## `legacy_secondary_label.ts`

Older metric panels stored a custom secondary-metric name on visualization state as `secondaryLabel`. Panel rendering still passes that visualization field into the chart expression (`toExpression`). If it is absent, the chart uses the secondary metric column name from datasource state.

This hydration is an editor migration: it overwrites the secondary metric column label in datasource state with visualization `secondaryLabel`, then removes `secondaryLabel` from visualization state so the next save persists the new source of truth.

Dashboard panel rendering must not do that. It does not persist, and dropping visualization `secondaryLabel` would make the chart show the existing column name instead — which can differ from the legacy vis text.

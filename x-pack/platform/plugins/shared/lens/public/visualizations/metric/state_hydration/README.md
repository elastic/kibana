# Metric state hydration

Metric-specific runtime patches to visualization state and datasource layers. Invoked from `applyStateHydration` after the metric type guard.

- `editor` (Lens editor load and save): secondary-label migration.
- `expression` (dashboard panel render): none yet.

## `legacy_secondary_label.ts`

Older metric panels stored a custom secondary-metric name on visualization state as `secondaryLabel`. Panel rendering still passes that visualization field into the chart expression (`toExpression`). If it is absent, the chart uses the secondary metric column name from datasource state.

This hydration is an editor migration: it overwrites the secondary metric column label in datasource state with visualization `secondaryLabel`, then removes `secondaryLabel` from visualization state so the next save persists the new source of truth.

Dashboard panel rendering must not do that. It does not persist, and dropping visualization `secondaryLabel` would make the chart show the existing column name instead — which can differ from the legacy vis text.

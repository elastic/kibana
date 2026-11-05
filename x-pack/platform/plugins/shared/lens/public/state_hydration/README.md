# State hydration

Fills visualization and datasource state with information known at runtime.

`applyStateHydration` first runs datasource hydrations that do not depend on chart type, then type-guards the active visualization and runs that chart type's hydrations for the caller context:

- `editor` — Lens editor load and save
- `expression` — dashboard panel render (`persistedStateToExpression`)

Load and panel render pass `indexPatterns` so ES|QL layers can pick up `timeField` from the loaded DataViews. Persist (`mergeToNewDoc`) omits `indexPatterns`; session layers already have `timeField` from load.

Call sites pass a visualization id and context. They do not name a chart type or pick a hydration list.

Datasource hydrations live next to that datasource (for example `hydrateTextBasedLayerTimeFields`). Chart-type hydrations live next to that visualization. Add a new one by extending the dispatch in `apply_hydration.ts`.

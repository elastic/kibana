# State hydration

Fills visualization and datasource state with information known at runtime.

`applyStateHydration` type-guards the active visualization and runs that chart type's hydrations for the caller context:

- `editor` — Lens editor load and save
- `expression` — dashboard panel render (`persistedStateToExpression`)

Call sites pass a visualization id and context. They do not name a chart type or pick a hydration list.

Chart-type hydrations live next to that visualization. Add a new one by extending the dispatch in `apply_hydration.ts`.

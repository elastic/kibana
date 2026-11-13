# Lens XY overlay providers

An XY overlay provider lets a plugin draw extra content, such as points, on top of existing Lens XY
charts without changing the chart. Nothing is stored in the chart: Lens decides at render time
whether a provider applies, fetches its overlay after the chart has loaded, and routes clicks on the
overlay back to the provider.

Use it to show data that relates to a chart but doesn't belong in its query, such as exemplars,
deployments or alerts, on every chart where it makes sense: dashboards, Discover and any app that
embeds Lens.

> This API is experimental and might change even in minor versions.

## Scope

- **XY charts only.** XY charts (`lnsXY`) are the only Lens charts that render overlays, so Lens
  never evaluates providers for other visualizations.
- **Points only.** `fetchOverlay` returns a points overlay today. Other overlay shapes would be added
  to the `LensXYOverlay` union.
- **Additive only.** A provider can't change the chart's own data, columns or saved state.

## Registering a provider

Register providers in the `setup` lifecycle of your public plugin:

```ts
import type { CoreSetup } from '@kbn/core/public';
import type { LensPublicSetup } from '@kbn/lens-plugin/public';
import type { LensXYOverlayProvider } from '@kbn/lens-common';

const exemplarsProvider: LensXYOverlayProvider = {
  id: 'myPlugin.exemplars',
  isApplicable: ({ executionContext }, { esql }) =>
    executionContext?.type === 'dashboard' && esql !== undefined && esql.includes('STATS'),
  fetchOverlay: async ({ layer, executeEsql }) => {
    const { rows } = await executeEsql(`SET exemplars={"limit": 200};\n${layer.esql}`, {
      title: 'Exemplars',
      description: 'Fetches the exemplars drawn on the chart.',
    });
    return {
      type: 'points',
      title: 'Exemplars',
      points: rows.map((row, index) => ({
        id: `exemplar-${index}`,
        x: Date.parse(String(row['@timestamp'])),
        y: Number(row.value),
      })),
    };
  },
  onPointClick: ({ pointId }) => {
    // open a flyout, navigate, ...
  },
};

export class MyPlugin {
  setup(core: CoreSetup, { lens }: { lens: LensPublicSetup }) {
    lens.registerXYOverlayProvider(exemplarsProvider);
  }
}
```

Provider ids must be unique and namespaced (`<plugin>.<feature>`). Registering the same id twice
throws.

## The provider contract

### `isApplicable(context, layer)`

Called once per layer of every XY chart Lens renders, on every chart load. Return `true` to fetch an
overlay for that layer. It must be synchronous and cheap: dashboards render many charts, and each
match costs at least one extra query. A rule that throws is treated as `false`.

- `layer.layerId` is the id of the layer.
- `layer.esql` is the ES|QL query of the layer, or `undefined` for form-based layers.
- `context.layers` lists every layer of the chart.
- `context.executionContext` identifies the surface rendering the chart. Match on its `type`:

| Surface | `executionContext.type` |
|---|---|
| Dashboard panel | `dashboard` |
| Discover histogram | `discover` (with `name: 'unified_histogram'`) |
| App embedding the Lens component | whatever the app passes in the `executionContext` prop, by convention its app id |

To use a feature flag or other plugin state in the rule, read it in your plugin and let the provider
read the cached value, because `isApplicable` gets no services. Lens checks the rule on every chart
load, so a flag change applies on the next refresh.

### `fetchOverlay(context)`

Called after the base chart has rendered, once per matching layer. Resolve to the overlay, or to
`undefined` when there is nothing to draw.

Use `context.executeEsql(esql, meta)` to query data. It runs the query with the same scope as the
chart:

- the chart's time range, and its time field for `?_tstart` / `?_tend`;
- the dashboard or app filters and KQL query, unless the layer ignores global filters;
- ES|QL control variables, project routing and the approximation setting;
- the chart's search session, so a refresh re-runs it;
- the chart's abort signal, so a superseded load cancels it.

The request is listed in the chart Inspector under `meta.title` and `meta.description`. The context
also exposes `timeRange`, `filters`, `query`, `esqlVariables` and `abortSignal` for providers that
build their own requests.

Each returned point needs a stable `id`, which Lens passes back on click, and `x` / `y` values in the
chart's coordinates. On time charts `x` is a timestamp in milliseconds. Points are bound to the Y axis
of the layer they were fetched for. If that layer isn't drawn, the overlay is dropped.

### `onPointClick(event)`

Optional. Called when the user clicks a point of the provider's overlay, with `providerId`, `layerId`
and the point's `pointId`. Keep your own map from point id to data, as the exemplars example does.
Clicks aren't dispatched when the host disables the chart's triggers.

Open UI through core services, for example `core.overlays.openFlyout`, so it works on every surface
and not only inside your own app.

## Lifecycle and failures

- Overlays never delay the chart: they're fetched after the base data has rendered.
- On every chart reload Lens drops the previous overlays and fetches new ones.
- Providers run independently. A rejected `fetchOverlay` doesn't affect other providers or the chart.
  The chart shows a warning badge that names the provider and the error.
- Results of a load that was superseded or aborted are discarded.

## Turning providers off from the host

An app that renders the Lens component can switch providers off for that chart with the runtime-only
`xyOverlayProviders` prop, keyed by provider id. `false` turns a provider off; `true` or a missing
entry lets the provider's rules decide. Toggling it refreshes only the overlays, not the chart, and it
is never persisted.

```tsx
<lens.EmbeddableComponent
  // ...
  executionContext={{ type: 'myApp' }}
  xyOverlayProviders={{ 'myPlugin.exemplars': showExemplars }}
/>
```

## Example

`x-pack/examples/lens_exemplars_example` registers an exemplars provider. It applies to the example
app, dashboards and Discover, is gated by a feature flag, and opens a flyout when an exemplar is
clicked. Run it with `pnpm start --run-examples`.

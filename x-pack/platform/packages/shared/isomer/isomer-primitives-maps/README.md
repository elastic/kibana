# @kbn/isomer-primitives-maps

An Isomer pack with one node, `map`: markers, geotile cells, choropleth regions, and arcs, as geography rather than Maps layer descriptors.

```ts
import { defineMapsPack } from '@kbn/isomer-primitives-maps';

const maps = defineMapsPack({ geometry: { world_countries } });
```

The static `react` renderer draws one inline SVG, which `html` and `snapshot` use too:

- a fixed `view` is Web Mercator at a center and zoom, as MapLibre draws a Kibana map in a panel of the node's `width` and `height`;
- `fit` frames the data;
- countries from `geometry.world_countries` form an outline basemap under everything;
- regions fill the boundary file named by `regionSet`, joined on the property Kibana Maps uses (`iso2` for countries, the English name otherwise), colored by `regionRamp`;
- `markerRamp` colors and sizes markers by `value`, as Kibana draws coarse geo-grid clusters;
- `cellRamp` colors geotile cells.

Ramps are Kibana Maps' (`euiPaletteCool(8)` and its siblings under Borealis).

The pack ships no geometry. A host passes the EMS boundary files it has. Without them a map draws on a plain ground and lists its regions.

## Differences from the older stack

Ported from `isomer/15-compose-reply`:

- Written against `@elastic/isomer-sdk` 0.2.0 instead of `@kbn/npm-isomer`. Markdown uses the SDK's builder, and the snapshot height metric replaces the old `svgHeight`.
- The pack is `defineMapsPack({ geometry })`, shaped like the charts and Vega packs; `mapsPack` is the pack without geometry.
- The node gains `width`, `height`, `markerRamp`, `cellRamp`, `regionRamp`, and the `france_departments` and `uk_subdivisions` region sets.
- A fixed view projects exactly, at MapLibre's 512-pixel tiles, instead of approximating a span from the zoom.
- The renderer draws regions from host geometry instead of listing them, and paints with literal colors and SVG text instead of CSS variables and positioned labels, so a rasterizer draws it too.
- The live MapLibre override from `isomer/8-live-map` is not ported: it needs the Maps plugin's browser bundle.

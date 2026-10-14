# @kbn/isomer-primitives-vega

An Isomer primitive pack with one node, `vega`: a Vega or Vega-Lite spec with inline data, drawn by the real Vega runtime.

```ts
import { createKibanaIsomerRuntime } from '@kbn/isomer';
import { vegaPack } from '@kbn/isomer-primitives-vega';

const runtime = createKibanaIsomerRuntime({ packs: [vegaPack] });

runtime.surfaces.html.render({
  type: 'view',
  body: [
    {
      type: 'vega',
      mode: 'vega-lite',
      width: 480,
      height: 240,
      caption: 'Checkout errors peaked on Wednesday.',
      spec: {
        data: {
          values: [
            { day: 'Mon', errors: 12 },
            { day: 'Wed', errors: 41 },
          ],
        },
        mark: 'bar',
        encoding: {
          x: { field: 'day', type: 'ordinal' },
          y: { field: 'errors', type: 'quantitative' },
        },
      },
    },
  ],
});
```

## The node

| Field     | What it is                                                                |
| --------- | ------------------------------------------------------------------------- |
| `mode`    | `vega` or `vega-lite`: the grammar `spec` is written in.                  |
| `spec`    | The spec. Data is inline under `values`; nothing loads by URL.            |
| `width`   | The chart's width in CSS pixels, 16–4096, axes and legends included.      |
| `height`  | The chart's height, on the same terms.                                    |
| `caption` | One sentence saying what the chart shows: the alt text and the text form. |

The node's size wins over the spec's: a single view is fitted to it with `autosize: fit`, and a composite one (`concat`, `facet`, `repeat`) is scaled into it through the SVG `viewBox`.

## Surfaces

- `react`, `html`: inline SVG from Vega's headless SVG renderer, rendered synchronously. A spec Vega cannot draw falls back to its caption.
- `snapshot`: the same SVG, in the theme `snapshotTheme` picks for the frame.
- `text`, `markdown`: the caption and a summary of the first inline dataset, with a table of its first rows in Markdown.
- `slack`: a picture. The pack declares `vega` in `slackAssetTypes`, so a render with `collectAssets` returns the chart as an asset for the host to rasterize and upload, with the text form as alt text; without it, Slack gets the Markdown.

## A spec never reaches outside itself

Specs are author-written code, so the pack treats them as untrusted at every layer:

- **Validation** reports every `url` (data sources, lookups, image marks, signal-valued URLs), every `href`, and every bound input's `element`, at the path it sits on. Rows under `values` and `datasets` are data and are not inspected.
- **`sanitize`** strips the same keys, and `usermeta`, before every render.
- **The loader** refuses every load, fetch, and file read.
- **The scene** loses every link and image source after the dataflow runs, and every style value a CSS parser could turn into a fetch, since a signal or a data row can set one. A fetching `background` becomes `transparent`, and the SVG is refused if any `url(` other than a reference to its own defs survives.
- **Cursors** stay keywords: any other `cursor` is stripped, and `config.events.globalCursor` is forced off so a chart never styles the page.
- **Expressions** run through `vega-interpreter` (`parse(…, { ast: true })`), never `new Function`, so charts render under `--disallow-code-generation-from-strings`.
- **Events** cannot select elements outside the chart: `config.events.selector` is forced to `false`.

## Theming

`createVegaPack({ theme, snapshotTheme })` takes a `VegaTheme`: background, text, axis and grid colours, a categorical palette, a ramp, and fonts. `vegaConfig(theme)` and `vegaLiteConfig(theme)` turn it into a Vega `config`, under the spec's own.

The defaults come from `@kbn/isomer-theme`'s Borealis tokens. `react` and `html` have no colour mode, so they draw with `vegaBorealisAdaptiveTheme`: EUI's vis palette, with text and lines in `currentColor` so the chart follows the host's light or dark text colour. `snapshotTheme` maps the frame's resolved palette to a theme; it defaults to `vegaBorealisLightTheme`, and `vegaBorealisDarkTheme` is there for dark frames. The prototype's `vegaAdaptiveTheme`, `vegaLightTheme`, and `vegaDarkTheme` are exported too.

## Making a chart live

Request the `vegaInteractive` enhancement on the html render and each chart carries its compiled spec beside its SVG. `hydrateVega(root)` replaces each SVG with a live Vega view, with tooltips from `vega-tooltip`, under the same loader, interpreter, and event rules. It draws through an SVG renderer that runs the scene scrub before every render.

## Host-provided expression functions

Functions registered with `vega.expressionFunction(name, fn)` are visible to the interpreter, which is how a host stubs functions its specs call, such as Kibana's `kibanaAddFilter`.

## Loading Vega

Vega and its sub-packages are ESM only. Kibana's server requires them from CommonJS, which Node allows for an ESM graph without a top-level `await`. `vega-canvas`'s Node build has one, `await import('canvas')`, so `patches/vega-canvas@2.0.0.patch` resolves its browser build under `node` too. Headless SVG rendering needs no canvas; the canvas-only `label` and `wordcloud` transforms and the `heatmap` image fail as they would without the `canvas` package.

## Testing

The Jest preset mocks `vega` and `vega-lite` with their UMD bundles in a `vm` sandbox. This package's tests run the real ESM graph instead (`src/test_helpers/jest_setup.js`, `src/test_helpers/jest_transform.js`), with `vega-canvas` mapped to its browser build and no canvas, as on a server. `src/corpus/` holds 57 specs by feature class, plus Kibana's sample-data and default specs with Elasticsearch-shaped inline data; each must draw a data mark, render deterministically, and match Vega's own `toSVG()`, fetching nothing.

```sh
node scripts/jest --config x-pack/platform/packages/shared/isomer/isomer-primitives-vega/jest.config.js
```

# @kbn/isomer-charts-elastic-node

The Elastic Charts engine with a static `draw` for Kibana's server: charts mount in one jsdom window whose canvases draw through Skia (`@napi-rs/canvas`), so the `html` and `snapshot` surfaces get each chart as drawn.

`defineElasticChartsNodeEngine` starts a worker thread that owns that window and Skia, and resolves once it can draw; the host thread gets no DOM globals. `close()` stops it.

## Differences from the Isomer source

- A package of its own, `shared-server`, so jsdom and Skia never reach a browser bundle; upstream it is the `@elastic/isomer-charts-elastic/node` entry.
- Resolves Elastic Charts' stylesheets with `require.resolve` instead of `createRequire(import.meta.url)`, and starts the worker from `node_worker.js` beside the host file instead of `new URL('./node_worker.js', import.meta.url)`, since Kibana compiles server code to CommonJS. From source, `node_worker_src_harness.js` registers Kibana's transpiler first, as screenshotting's PDF worker does.
- Reaches no jsdom selector: `getComputedStyle` returns an element's inline style, and the engine walks parents and uses `getElementsBy*`. jsdom's selector engine compiles selectors with `new Function`, which packaged Kibana's `--disallow-code-generation-from-strings` rejects, and Elastic Charts calls `getComputedStyle` at mount.
- Imports the engine and pack as `@kbn/isomer-charts-elastic` and `@kbn/isomer-primitives-charts`.
- Tests use Jest's globals instead of importing from `vitest`.
- Formatting follows Kibana's Prettier settings.

This package is the source of truth. It was ported from `packages/isomer-charts-elastic/src/node.ts, node_worker.ts and node_draw.ts` on elastic/isomer's `claude/charts-primitive-pack-spike-d86fe8` at `aca0a25f`, which is kept as a record and will not be merged; the differences above are from that port.

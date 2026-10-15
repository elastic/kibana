# @elastic/isomer-charts-elastic

A `ChartEngine` for `@elastic/isomer-primitives-charts`, drawn by Elastic Charts 73.3.0 (Kibana's pin) under Kibana's Borealis chart theme. Private: it is the spike's evidence for whether Elastic Charts can be the pack's engine.

```ts
import { defineChartsPack } from '@elastic/isomer-primitives-charts';
import { defineElasticChartsEngine } from '@elastic/isomer-charts-elastic';

const pack = defineChartsPack(defineElasticChartsEngine({ hints }), {
  render: 'live',
});
```

- **Live only, for now.** `xyChart` and `metricTrend` draw; the other types render the pack's data table until their components land. Static drawing (the phase 0 jsdom and Skia path) comes later.
- **The page needs Elastic Charts' stylesheet**, `@elastic/charts/dist/theme_light.css` or `theme_dark.css`: without it a chart measures zero and never draws. Kibana always loads it.
- **Hints** carry presentation the spec does not: legend, literal series colors, value labels, curves, axis visibility. They are keyed by node `id`, validated against a strict schema when the engine is built, and never change what a chart says.

`scripts/charts-spike/compare/run.js` renders panels through this engine in Chromium and pixel-diffs them against Kibana screenshots.

## Differences from the Isomer source

- Imports the pack as `@kbn/isomer-primitives-charts` instead of `@elastic/isomer-primitives-charts`.
- Tests use Jest's globals instead of importing from `vitest`.
- Formatting follows Kibana's Prettier settings.

This package is the source of truth. It was ported from `packages/isomer-charts-elastic/src` on elastic/isomer's `claude/charts-primitive-pack-spike-d86fe8` at `aca0a25f`, which is kept as a record and will not be merged; the differences above are from that port.

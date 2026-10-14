# @kbn/isomer-primitives-charts

Chart primitives for Isomer: `xyChart`, `donut`, `treemap`, `heatmap`, `metricTrend`, and `gauge`, with their schemas, catalog, examples, and validation. It depends on `@elastic/isomer-sdk` and `@elastic/distillate` alone.

The pack does not draw charts yet. On every surface, a chart renders as its title, description, a one-sentence summary, and its data table.

```ts
import { chartsPack } from '@kbn/isomer-primitives-charts';

createKibanaIsomerRuntime({ packs: [chartsPack] });
```

## Plans

- Draw the charts with a charting library such as Elastic Charts: live in the browser, and as images drawn ahead of the render for static surfaces such as Slack. The summary and data table stay as the accessible reading of every chart.
- Raise each chart's `selection` event when a reader clicks a drawn mark. The schemas already accept `selection`; nothing raises it until charts are drawn.
- Take colors from `@kbn/isomer-theme` instead of the Borealis literals in `src/theme/tokens.ts`.

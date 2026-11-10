# Lens exemplars example

To run this example plugin, use the command `pnpm start --run-examples`, then install the
"Sample web logs" data set.

This example registers a Lens extension through `lens.registerExtension` that draws exemplar
points over XY charts. Nothing is stored in the chart: Lens evaluates the extension rules at
render time, fetches the overlay after the chart data has loaded, and routes clicks on the
points back to the extension.

The extension applies to ES|QL layers with a `STATS` command rendered by this app:

- On `TS` metrics queries it fetches real exemplars with the ES|QL `SET exemplars` setting.
- On any other query it simulates exemplars with the largest raw samples of the aggregated field.

The "Show exemplars" switch uses the runtime-only `extensions` prop of the Lens component.

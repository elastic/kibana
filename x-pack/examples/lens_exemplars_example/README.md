# Lens exemplars example

To run this example plugin, use the command `pnpm start --run-examples`, then install the
"Sample web logs" data set.

This example registers a Lens XY overlay provider through `lens.registerXYOverlayProvider` that
draws exemplar points on top of XY charts, the only Lens charts that render overlays. Nothing is
stored in the chart: Lens evaluates the provider rules at render time, fetches the overlay after
the chart data has loaded, and routes clicks on the points back to the provider. See the
[XY overlay providers guide](../../platform/plugins/shared/lens/public/xy_overlay_providers/README.md)
for the full contract.

The provider applies to ES|QL layers with a `STATS` command rendered by this app, a dashboard
or the Discover histogram. It matches on the `executionContext.type` each surface passes to Lens
(`lens_exemplars_example`, `dashboard`, `discover`):

- On `TS` metrics queries it fetches real exemplars with the ES|QL `SET exemplars` setting.
- On any other query it simulates exemplars with the largest raw samples of the aggregated field.

Clicking an exemplar opens its fields in a flyout. The plugin opens it with
`core.overlays.openFlyout`, so it works on dashboards and in Discover too, not only in this app.

The "Show exemplars" switch uses the runtime-only `xyOverlayProviders` prop of the Lens component.

The provider is behind the `lensExemplarsExample.enabled` feature flag. It defaults to `false`,
so the provider is off wherever the flag isn't served. Lens checks the flag each time a chart
loads, so a change applies on the next chart refresh. Enable it locally with:

```yaml
feature_flags.overrides:
  lensExemplarsExample.enabled: true
```

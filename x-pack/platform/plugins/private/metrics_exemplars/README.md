# Metrics exemplars

Registers a Lens overlay provider for metric exemplars. The provider decides which charts it applies
to, builds the exemplars query from the chart's ES|QL query, turns the results into chart points, and
opens a flyout with the exemplar's details when one is clicked.

The provider applies to ES|QL layers with a `TS` source and a `STATS` command, rendered by:

- the Metrics grid in Discover (`executionContext`: `{ type: 'discover', name: 'metrics_grid' }`)
- the Discover histogram (`{ type: 'discover', name: 'unified_histogram' }`)
- dashboards (`{ type: 'dashboard' }`)

It fetches the exemplars by prepending `SET exemplars={"limit": 1000};` to the layer query. Clicking an
exemplar opens its fields in a flyout.

The provider is behind the `observability.metricsExemplarsEnabled` feature flag, off by default.
Enable it locally with:

```yaml
feature_flags.overrides:
  observability.metricsExemplarsEnabled: true
```

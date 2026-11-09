# Signal Investigation

Find related changes from an alert, a dashboard chart, or Discover. The plugin builds an investigation seed from the selected signal, runs the registered analyzers (log change points, log rate analysis, and analyzers registered by other plugins such as APM and Metrics), and shows the ranked leads in a flyout.

Analyzers implement `SignalAnalyzer` from `@kbn/signal-investigation-contract` and register through the plugin's server setup contract.

## Configuration

- `xpack.signalInvestigation.enabled` (default `true`) turns the plugin on or off. It is disabled in serverless.
- `xpack.signalInvestigation.chartAction.enabled` (default `false`) shows the "Find related changes" action on dashboard charts in Observability and Classic spaces.

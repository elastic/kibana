# pageRenderScreenshotting

A drop-in replacement for the `screenshotting` plugin's `ScreenshottingStart` contract that renders pages with an external [page-render-service](https://github.com/elastic/page-render-service) instead of a local Chromium.

When this plugin is enabled, the `reporting` plugin uses it in place of `screenshotting`. This makes PDF and PNG reports possible on serverless, where Chromium is not shipped.

## Config

```yaml
xpack.pageRenderScreenshotting.enabled: true
xpack.pageRenderScreenshotting.url: https://page-render-service.page-render-service.svc

# Client certificate presented to the service. Must be the same as xpack.security.uiam.ssl.
xpack.pageRenderScreenshotting.ssl.certificate: /path/to/uiam.crt
xpack.pageRenderScreenshotting.ssl.key: /path/to/uiam.key
xpack.pageRenderScreenshotting.ssl.certificateAuthorities: /path/to/ca.crt

# Optional. Origin the service uses to load Kibana pages. Defaults to server.publicBaseUrl.
xpack.pageRenderScreenshotting.kibanaBaseUrl: https://kibana.example.com
```

The plugin is disabled by default.

On serverless, PDF and PNG reports are also gated by feature flags: `reporting.serverlessOnDemandExportEnabled` for on-demand reports and `reporting.serverlessScheduledExportEnabled` for scheduled reports. See `x-pack/platform/plugins/private/reporting/common/feature_flags.ts`.

## Limitations

- One URL per report. Jobs with more than one (deprecated PDF v1, multi-locator PDF v2) fail.
- Pages render at a device scale factor of 1.
- PDFs have no title header or page-number footer, and the custom PDF logo setting is ignored.
- `diagnose()` reports that browser diagnostics are not available.

# pageRenderScreenshotting

Implements a `getScreenshots()` contract structurally identical to the real `screenshotting` plugin's `ScreenshottingStart`, backed by a POST to an external [`page-render-service`](https://github.com/elastic/page-render-service) instance instead of local Chromium.

The `reporting` plugin prefers this plugin's contract over the real `screenshotting` plugin's whenever it's enabled (see `x-pack/platform/plugins/private/reporting/server/plugin.ts`), so on serverless — where `screenshotting` is disabled and its Chromium binaries are stripped from the build — dashboard PDF/PNG export can still work end-to-end by rendering through a remote service.

Moving the browser out of Kibana also decouples Chromium CVE patching from Kibana releases, and stops Kibana background nodes having to be sized for Chromium.

Tracked by [response-ops-team#750](https://github.com/elastic/response-ops-team/issues/750).

## Config

```yaml
xpack.pageRenderScreenshotting.enabled: true
xpack.pageRenderScreenshotting.url: https://page-render-service.page-render-service.svc

# The service reads this Kibana's identity off the client certificate we present and forwards it
# to UIAM, so this must be the certificate UIAM already knows us by — the same one set on
# xpack.security.uiam.ssl.
xpack.pageRenderScreenshotting.ssl.certificate: /path/to/uiam.crt
xpack.pageRenderScreenshotting.ssl.key: /path/to/uiam.key
xpack.pageRenderScreenshotting.ssl.certificateAuthorities: /path/to/ca.crt

# Optional. Origin the service should use to fetch this Kibana, substituted into capture URLs.
# Falls back to server.publicBaseUrl.
xpack.pageRenderScreenshotting.kibanaBaseUrl: https://<project_id>.kb.<region>.<csp>.internal.<base-domain>
```

Off by default. Reporting falls back to the real `screenshotting` plugin (if present) when this one is disabled.

Enabling the plugin does not by itself expose PDF/PNG export to serverless users: the share-menu entries are separately gated by the `reporting.serverlessExportEnabled` feature flag. See `x-pack/platform/plugins/private/reporting/common/feature_flags.ts`.

## Scope

- PDF and PNG only, both `print` and `preserve_layout` for PDF, `preserve_layout` only for PNG (matching what Kibana ever sends for PNG today).
- No support for expression-based (Canvas) capture — `getScreenshots()` rejects those calls.
- No custom PDF logo, no header/footer templates, no time-range suffix in the title.
- On-demand exports only. Scheduled and recurring exports are not routed through the service ([response-ops-team#760](https://github.com/elastic/response-ops-team/issues/760)).

## Known gaps

- Rendered PDFs currently carry a banner stamped by the service ("Rendered in MT Reporting page-render-service"). Removing it is tracked by [response-ops-team#758](https://github.com/elastic/response-ops-team/issues/758). PNG output is unbannered — the service has no equivalent for images.
- The plugin does not yet own a retry schedule for a queueless service ([response-ops-team#754](https://github.com/elastic/response-ops-team/issues/754)).

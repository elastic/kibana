# pageRenderScreenshotting

POC plugin for the MT Reporting effort ([response-ops-team#682](https://github.com/elastic/response-ops-team/issues/682)). Implements a `getScreenshots()` contract that is structurally identical to the real `screenshotting` plugin's `ScreenshottingStart`, backed by a POST to an external [`page-render-service`](https://github.com/elastic/page-render-service) instance instead of local Chromium.

The `reporting` plugin prefers this plugin's contract over the real `screenshotting` plugin's whenever it's enabled (see `x-pack/platform/plugins/private/reporting/server/plugin.ts`), so on serverless — where `screenshotting` is disabled and its Chromium binaries are stripped from the build — dashboard PDF/PNG export can still work end-to-end by rendering through a remote service instead.

## Config

```yaml
xpack.pageRenderScreenshotting.enabled: true
xpack.pageRenderScreenshotting.url: http://localhost:3001 # page-render-service base URL
xpack.pageRenderScreenshotting.secret: dev-poc-shared-secret # hardcoded POC default, update to a real secret later
```

Off by default. Reporting falls back to the real `screenshotting` plugin (if present) when this one is disabled.

## Scope (POC)

- PDF and PNG only, both `print` and `preserve_layout` for PDF, `preserve_layout` only for PNG (matching what real Kibana ever sends for PNG today).
- No support for expression-based (Canvas) capture — `getScreenshots()` rejects those calls.
- No custom PDF logo, no header/footer templates, no time-range suffix in the title.
- Every rendered PDF carries a demo banner ("Rendered in MT Reporting page-render-service") stamped by the service; PNG output is unbannered (the service has no equivalent feature for images).

See `POC-PLAN.md` at the workspace root (`multi-tenant-reporting/`) for the full design and status.

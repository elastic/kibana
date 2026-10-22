/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Phase 3 capstone proof: runs the full `renderDashboardReport` orchestrator (resolve real
 * `panelsJSON` grid data, navigate the headless client worker to the real redirect URL,
 * wait for `renderComplete`, sink every panel, compose the page) against a *real, running*
 * Kibana dev server, exactly the path `pngServer`'s `runTask` takes, and writes the actual
 * output PNG to disk for visual inspection -- Phase 2's `verify_real_dashboard_boot.js`
 * proved the navigation mechanism alone; this proves the whole render.
 *
 * Prerequisites (left running by the operator, not started by this script):
 *   - `node scripts/es snapshot --license trial` (Elasticsearch on :9200)
 *   - `node scripts/kibana --dev --no-base-path` (Kibana on :5601)
 *   - A saved dashboard, reachable with basic auth.
 *
 * Run with:
 *   KIBANA_URL=http://localhost:5601 DASHBOARD_ID=<id> \
 *     node --disallow-code-generation-from-strings \
 *     x-pack/platform/packages/private/reporting-server-render/scripts/verify_dashboard_render.js \
 *     [outPath]
 *
 * Phase 4 (Tier 5) findings from running this against dashboards beyond the single `lnsXY`
 * proof dashboard (an `lnsDatatable` panel, specifically -- see `headless_dom_environment.ts`'s
 * `NoopBroadcastChannel` and `navigate_and_wait.ts`'s `waitForRenderComplete` doc comments for
 * the two real bugs those panels surfaced and fixed), recorded here for the Phase 7 write-up:
 *   - ML swimlane (`swimlane_container.tsx`) and every SLO dashboard embeddable (overview's
 *     `Metric`, error-budget's/burn-rate's line charts) are all `@elastic/charts`-family
 *     components (`Heatmap`/`Metric`/XY), confirmed by reading their source directly (no ML
 *     job or SLO definition exists in this sandbox to render live) -- the existing generic
 *     canvas-readback sink (`element_sinks.ts`) should already cover them with no new
 *     panel-type-specific code, modulo whatever this list's other findings also apply to them.
 *   - Basic-auth (`Authorization: Basic ...`) requests in this environment can 403 on
 *     `/internal/content_management/favorites/dashboard` (a background call the dashboard
 *     app makes, unrelated to any specific panel), and Kibana's own
 *     `UnauthorizedResponseHttpInterceptor.responseError` throws a secondary
 *     `TypeError: Cannot read properties of undefined (reading 'credentials')` handling that
 *     403 -- a real Kibana core interceptor bug surfaced by this sandbox's basic-auth setup,
 *     not a reporting-server-render shim gap, but one that can surface as if it were a panel
 *     render error since the exception propagates through the same `fetch` pipeline every
 *     panel's data-fetching uses. Not fixed here (out of this package's scope); tracked as a
 *     known interaction for whoever re-runs Tier 5+ verification against a basic-auth sandbox.
 *
 * Phase 5 (Tier 6) findings:
 *   - Canvas workpad's `plot`/`pie` renderer functions (`@kbn/flot-charts`) and
 *     `vis_type_vega`'s default `renderer: 'canvas'` path both draw through a plain
 *     `<canvas>` element's `getContext('2d')` -- already fully covered by the existing
 *     canvas-readback sink with no Vega/flot-specific code needed.
 *   - `@kbn/flot-charts`' `text.js` plugin (the Canvas `plot`/`pie` "value labels" numbers
 *     overlay) does need its own fix: it creates and measures a DOM-only `<div
 *     class="valueLabel">` (`jQuery.width()`/`.height()`, i.e. `offsetWidth`/`offsetHeight`)
 *     to center it over a data point, which this package's layout shim had no way to answer
 *     correctly for (jsdom has no layout engine; see Phase 3's identical finding for
 *     dashboard grids). Fixed in `layout_shim.ts`'s `measureTextRect`: a leaf, text-only
 *     element with no explicit rect gets a real `measureText`-based size estimate instead of
 *     the previous unconditional `0`.
 *   - A live Vega-Lite panel in this sandbox hit the same basic-auth/`UnauthorizedResponse-
 *     HttpInterceptor` finding above (Vega's own ES-search data load goes through the same
 *     `core.http` fetch pipeline as the favorites call), not a new Vega-specific gap --
 *     re-run against a session-cookie-authenticated sandbox to get a clean proof once that
 *     interceptor issue is addressed.
 */

require('@kbn/setup-node-env');

// See `verify_real_dashboard_boot.js`'s identical comment: `@kbn/setup-node-env`'s own
// unconditional-`process.exit(1)` `unhandledRejection` handler is wrong for a worker that
// must survive one broken panel's async script error.
process.removeAllListeners('unhandledRejection');

const fs = require('fs');
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');

const KIBANA_URL = process.env.KIBANA_URL || 'http://localhost:5601';
const DASHBOARD_ID = process.env.DASHBOARD_ID;
const BASIC_AUTH = Buffer.from('elastic:changeme').toString('base64');
const OUT_FILE = process.argv[2] || path.join(os.tmpdir(), 'reporting-server-render-dashboard.png');

if (!DASHBOARD_ID) {
  // eslint-disable-next-line no-console
  console.error('FAILED: set DASHBOARD_ID to a saved dashboard id');
  process.exit(1);
}

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('process unhandledRejection:', reason);
});

const main = async () => {
  const { LoopbackHttpClient } = require('../src/services/loopback_http_client');
  const { renderDashboardReport } = require('../src/export_types/render_dashboard_report');
  const { rasterizePageToPng } = require('../src/composer/rasterize_page');

  const client = new LoopbackHttpClient({
    baseUrl: KIBANA_URL,
    forwardedHeaders: { authorization: `Basic ${BASIC_AUTH}` },
  });

  const locatorParams = {
    id: 'DASHBOARD_APP_LOCATOR',
    version: '9.6.0',
    params: {
      dashboardId: DASHBOARD_ID,
      preserveSavedFilters: true,
      viewMode: 'view',
    },
  };

  const renderStart = performance.now();
  const heapBefore = process.memoryUsage().heapUsed;

  // eslint-disable-next-line no-console
  console.log(`Rendering dashboard ${DASHBOARD_ID} via renderDashboardReport ...`);
  const page = await renderDashboardReport({
    client,
    locatorParams,
    pageWidthPx: 1200,
    renderTimeoutMs: 60_000,
  });

  // eslint-disable-next-line no-console
  console.log(
    `Resolved ${page.panels.length} panel(s), page ${page.width}x${page.height}px. ` +
      `Compositing with takumi ...`
  );
  const png = await rasterizePageToPng(page);
  fs.writeFileSync(OUT_FILE, png);

  const renderEnd = performance.now();
  const heapAfter = process.memoryUsage().heapUsed;

  // eslint-disable-next-line no-console
  console.log(
    `OK: wrote ${OUT_FILE} (${png.length} bytes) from ${page.panels.length} panel(s) in ` +
      `${(renderEnd - renderStart).toFixed(0)}ms, heap delta ` +
      `${((heapAfter - heapBefore) / 1024 / 1024).toFixed(1)}MB.`
  );
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('FAILED:', error);
  process.exit(1);
});

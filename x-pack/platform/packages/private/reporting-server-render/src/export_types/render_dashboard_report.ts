/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildKibanaPath,
  REPORTING_REDIRECT_APP,
  REPORTING_REDIRECT_LOCATOR_STORE_KEY,
} from '@kbn/reporting-common';
import type { LocatorParams } from '@kbn/reporting-common/types';
import type { ComposedPage, ComposedPanel } from '../composer/page_composer';
import type { LoopbackHttpClient } from '../services/loopback_http_client';
import { createHeadlessDomEnvironment } from '../worker/headless_dom_environment';
import {
  injectScreenshotContextScript,
  installScreenshotContextBridge,
  installDynamicScriptRunner,
  runDocumentScripts,
  waitForGridRows,
  waitForQuiescence,
  waitForRenderComplete,
} from '../worker/navigate_and_wait';
import { resolveDashboardPanelLayout } from '../worker/resolve_dashboard_panels';
import { computePanelPixelPositions, computePageSize } from '../worker/dashboard_panel_layout';
import { matchPanelsToElements, sinkPanelElement } from '../worker/element_sinks';
import { collectPageCss } from '../worker/collect_page_css';
import { parseStylesheets } from '../lowering/takumi_css';
import { renderMapPanels } from '../worker/map_panels';
import { installPanelRectAssigner } from '../worker/panel_rect_assigner';
import { startMemorySampler } from '../services/memory_sampler';
import { withUnhandledRejectionGuard } from '../worker/unhandled_rejection_guard';

/**
 * Debug output, on only when `REPORTING_SERVER_RENDER_DUMP_DIR` is set (the same switch that
 * makes `element_sinks.ts` dump each panel's markup and CSS).
 */
const debug = (message: string) => {
  if (!process.env.REPORTING_SERVER_RENDER_DUMP_DIR) return;
  // eslint-disable-next-line no-console
  console.log(`[reporting-server-render] ${message}`);
};

export interface RenderDashboardReportOptions {
  client: LoopbackHttpClient;
  locatorParams: LocatorParams;
  /**
   * The dashboard's Saved Object space, if not the default space. `server.basePath` is not
   * needed here -- `client` already prefixes it onto every path it resolves (see
   * `LoopbackHttpClient.resolveUrl`), so passing it again to `buildKibanaPath` would
   * double-prefix the redirect path.
   */
  spaceId?: string;
  pageWidthPx: number;
  renderTimeoutMs?: number;
  /** Third-party origins the booted page (and map renderer) may fetch from; default Elastic Maps Service. */
  allowedExternalOrigins?: readonly string[];
}

/**
 * Phase 3's generic render path: resolve a dashboard's real panel grid data (independent of
 * the navigated page -- see `resolve_dashboard_panels.ts`), navigate the headless client
 * worker to its reporting-redirect URL exactly the way Phase 2 proved against a live Kibana
 * server, wait for every panel to reach `renderComplete`, then sink each panel element (a
 * canvas readback for chart-family panels, serialized DOM markup plus the page's live
 * Emotion stylesheet otherwise -- see `element_sinks.ts`) into one `ComposedPage` ready for
 * `rasterizePageToPng`/`rasterizePagesToPdf`.
 *
 * Only supports a `LocatorParams` whose `params` carries a `dashboardId` (the
 * `DASHBOARD_APP_LOCATOR`); a Lens/Canvas/Discover locator has no `panelsJSON` grid to read
 * and needs its own position-resolution strategy -- out of scope for this prototype pass
 * (see the package README's coverage matrix).
 *
 * Known Phase 6 risk not yet mitigated: `waitForRenderComplete`'s `ignorePanelIds`
 * keeps a crashing `'map'` panel's own `data-render-complete` from blocking every other
 * panel's wait, but if that crash also writes a `[data-render-error]` element (the real
 * `EmbeddablePanelImpl` error boundary's convention), this function's `renderErrors.length
 * > 0` check still throws for the whole dashboard -- `waitForRenderComplete` has no
 * per-element index correlation for the (globally queried) render-error selector the way it
 * does for the (one-per-panel, index-ordered) render-complete selector. Not hit by any
 * proof dashboard in this package's tests, which only exercise the EMS-basemap-only case;
 * revisit if a live dashboard with a map panel is found to throw here.
 */
const renderDashboardReportInner = async ({
  client,
  locatorParams,
  spaceId,
  pageWidthPx,
  renderTimeoutMs = 60_000,
  allowedExternalOrigins,
}: RenderDashboardReportOptions): Promise<ComposedPage> => {
  const phaseStart = Date.now();
  const dashboardId = (locatorParams.params as { dashboardId?: unknown } | undefined)?.dashboardId;
  if (typeof dashboardId !== 'string') {
    throw new Error(
      `renderDashboardReport: locatorParams.params.dashboardId is required and must be a string ` +
        `(got locator id "${locatorParams.id}")`
    );
  }

  const { title, panels } = await resolveDashboardPanelLayout(client, dashboardId);
  const positions = computePanelPixelPositions(panels, { containerWidthPx: pageWidthPx });
  const { width, height } = computePageSize(positions, { containerWidthPx: pageWidthPx });

  // Phase 6: map panels never go through the generic jsdom-boot path at all (see
  // `render_map_panel.ts`'s doc comment) -- excluded here from the generic render-complete
  // gate so a map panel's wrapper element (whose `maplibre-gl` JS never gets a usable WebGL
  // context in this environment) can never block every *other* panel's wait.
  const mapPanelIds = new Set(positions.filter((p) => p.type === 'map').map((p) => p.panelIndex));

  const redirectPath = buildKibanaPath({ basePath: '', spaceId, appPath: REPORTING_REDIRECT_APP });
  const redirectUrl = client.resolveUrl(redirectPath);

  const response = await client.fetch(redirectPath);
  if (!response.ok) {
    throw new Error(
      `renderDashboardReport: failed to fetch ${redirectPath}: ${
        response.status
      } ${await response.text()}`
    );
  }
  const rawHtml = await response.text();
  // `redirect_app.tsx` reads `screenshotMode.getScreenshotContext(REPORTING_REDIRECT_LOCATOR_STORE_KEY)`
  // (`'__REPORTING_REDIRECT_LOCATOR_STORE_KEY__'`), not a plain `locatorParams` key -- see
  // `printable_pdf_v2.ts`/`png_v2.ts`'s `urls` construction for the Chromium-era equivalent.
  const html = injectScreenshotContextScript(rawHtml, {
    [REPORTING_REDIRECT_LOCATOR_STORE_KEY]: locatorParams,
  });

  debug(`resolved+fetched +${Date.now() - phaseStart}ms`);
  const env = createHeadlessDomEnvironment({
    loopbackHttpClient: client,
    url: redirectUrl,
    html,
    allowedExternalOrigins,
  });
  debug(`env created +${Date.now() - phaseStart}ms`);
  let dynamicRunnerDispose: (() => void) | undefined;
  let rectAssignerDispose: (() => void) | undefined;
  try {
    return await withUnhandledRejectionGuard(
      async () => {
        installScreenshotContextBridge(env);
        // Gives every panel the pixel box its saved grid data implies as soon as it mounts;
        // jsdom has no layout engine, so without this charts/grids never learn their size.
        rectAssignerDispose = installPanelRectAssigner(env, positions, env.usageLog).dispose;
        const dynamicRunner = installDynamicScriptRunner(env, env.usageLog);
        dynamicRunnerDispose = dynamicRunner.dispose;
        // A bundle's own async error is logged to the usage log by
        // `installDynamicScriptRunner`/`runOneScript` already; nothing here needs to
        // additionally await `firstError` -- the render either reaches `renderComplete`
        // within the timeout or it doesn't.
        dynamicRunner.firstError.catch(() => {});

        const markPhase = (name: string) =>
          env.usageLog.record('phase.timing', `${name} at +${Date.now() - phaseStart}ms`);
        await runDocumentScripts(env, env.usageLog);
        markPhase('scripts');
        const { renderErrors, timedOut } = await waitForRenderComplete(env.document, {
          timeoutMs: renderTimeoutMs,
          ignorePanelIds: mapPanelIds,
          flushAnimationFrames: env.flushAnimationFrames,
          // One panel that never completes degrades that panel; it must not fail the report.
          onTimeout: 'return',
        });
        if (timedOut) env.usageLog.record('panel.warning', timedOut);
        if (renderErrors.length > 0) {
          throw new Error(
            `Dashboard "${dashboardId}" reported render errors: ${renderErrors.join('; ')}`
          );
        }

        // `renderComplete` is not final here: panels re-render once sized, and some report
        // complete before any content exists. See each function's doc comment.
        markPhase('renderComplete');
        await waitForQuiescence(env, { ignorePanelIds: mapPanelIds });
        markPhase('quiescence');
        await waitForGridRows(env);
        markPhase('gridRows');
        // Map panels: the page's JS map does the Maps client's work, MapLibre Native draws
        // it into the panel's canvas, and the generic sink does the rest.
        // Every panel with a MapLibre map: Maps panels, and Vega map views (which a dashboard
        // reports as `visualization`, not `map`).
        const mapPanelsToRender = positions
          .filter((p) => {
            const gridItem = env.document.getElementById(`panel-${p.panelIndex}`);
            return Boolean(gridItem?.getElementsByClassName('maplibregl-map')[0]);
          })
          .map((p) => p.panelIndex);
        await renderMapPanels(env, client, mapPanelsToRender, allowedExternalOrigins);
        markPhase('maps');

        const matched = matchPanelsToElements(env.document, positions);
        const pageCss = collectPageCss(env);
        env.usageLog.record(
          'pageCss.collected',
          `${pageCss.length} stylesheet(s), ${pageCss.reduce((n, c) => n + c.css.length, 0)} chars`
        );
        const panelCss = {
          parsedSheets: parseStylesheets(pageCss.map((sheet) => sheet.css)),
          bytesIn: pageCss.reduce((n, sheet) => n + sheet.css.length, 0),
        };

        // One at a time: each panel is a native render, and the page already holds hundreds
        // of MB; there is nothing to gain from racing them.
        markPhase('css');
        const sinkedPanels: ComposedPanel[] = [];
        for (const { element, position } of matched) {
          sinkedPanels.push(await sinkPanelElement(env, element, position, panelCss));
        }

        markPhase('sinks');
        debug(
          `usage: ${JSON.stringify(
            env.usageLog
              .getEntries()
              .filter((e) =>
                /^(panel\.|pageCss|takumi|dataGrid|quiescence|gridRows|phase)/.test(e.name)
              )
          )}`
        );
        const warningEntry = env.usageLog.getEntries().find((e) => e.name === 'panel.warning');
        return {
          width,
          height,
          title,
          panels: sinkedPanels,
          warnings: warningEntry?.distinctDetails?.length
            ? warningEntry.distinctDetails
            : undefined,
        };
      },
      (reason) => {
        // See `unhandled_rejection_guard.ts`'s doc comment: the navigated page's own
        // fire-and-forget promises (telemetry, etc.) rejecting here is expected, not a
        // reason to fail -- or crash -- this render.
        env.usageLog.record(
          'unhandledRejection',
          reason instanceof Error ? reason.message : String(reason)
        );
      }
    );
  } catch (error) {
    // Diagnostic aid: when the render fails (e.g. `waitForRenderComplete`'s timeout), dump
    // every shim/fetch this render actually touched -- correlating "which panel is stuck"
    // (from the timeout error's own message) against "what did this render's fetch/XHR
    // traffic actually look like" otherwise requires re-running with ad hoc `console.log`s.
    // eslint-disable-next-line no-console
    console.error(
      '[reporting-server-render] renderDashboardReport failed; shim usage for this render:',
      JSON.stringify(env.usageLog.getEntries())
    );
    throw error;
  } finally {
    dynamicRunnerDispose?.();
    rectAssignerDispose?.();
    env.dispose();
    debug(`disposed +${Date.now() - phaseStart}ms`);
  }
};

/**
 * Renders a dashboard to a `ComposedPage`, recording this process's memory before, at peak
 * and after (`page.memory`): the render runs in the Kibana server process, so the report's
 * cost is the process's growth. Sampled after the page environment is disposed, so `after`
 * shows what was retained.
 */
export const renderDashboardReport = async (
  options: RenderDashboardReportOptions
): Promise<ComposedPage> => {
  const stopSampling = startMemorySampler();
  try {
    const page = await renderDashboardReportInner(options);
    page.memory = stopSampling();
    return page;
  } catch (error) {
    stopSampling();
    throw error;
  }
};

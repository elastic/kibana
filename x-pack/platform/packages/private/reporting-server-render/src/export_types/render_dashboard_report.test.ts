/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import type { AddressInfo } from 'net';
import {
  REPORTING_REDIRECT_APP,
  REPORTING_REDIRECT_LOCATOR_STORE_KEY,
} from '@kbn/reporting-common';
import type { LocatorParams } from '@kbn/reporting-common/types';
import { LoopbackHttpClient } from '../services/loopback_http_client';
import { renderDashboardReport } from './render_dashboard_report';

/**
 * Proves the full resolve-panels -> navigate -> wait-for-render -> sink -> compose pipeline
 * end to end against a tiny local HTTP server standing in for Kibana -- mirroring
 * `navigate_and_wait.test.ts`'s approach, extended with the dashboard saved-object route
 * Phase 3 adds. The live-Kibana capstone proof (a real dashboard with real panel types) is
 * tracked separately; this proves the mechanism deterministically.
 */
describe('renderDashboardReport', () => {
  let server: http.Server;
  let baseUrl: string;

  const DASHBOARD_ID = 'test-dashboard';

  const panelsJSON = JSON.stringify([
    { panelIndex: 'markdown-panel', gridData: { x: 0, y: 0, w: 24, h: 10, i: 'markdown-panel' } },
    { panelIndex: 'chart-panel', gridData: { x: 24, y: 0, w: 24, h: 10, i: 'chart-panel' } },
  ]);

  const MAP_ID = 'test-map';
  const mapDashboardPanelsJSON = JSON.stringify([
    {
      panelIndex: 'map-panel',
      type: 'map',
      gridData: { x: 0, y: 0, w: 48, h: 20, i: 'map-panel' },
      panelRefName: 'panel_map-panel',
    },
  ]);
  // A dashboard's own references are namespaced per-panel as `${panelIndex}:${panelRefName}`,
  // not the bare `panelRefName` -- see `resolve_dashboard_panels.ts`'s doc comment.
  const mapDashboardReferences = [{ id: MAP_ID, name: 'map-panel:panel_map-panel', type: 'map' }];
  const mapStateJSON = JSON.stringify({ zoom: 2, center: { lon: 0, lat: 0 } });
  // No EMS_TMS layer -> `renderMapPanel` renders a blank style without ever calling the EMS
  // network, which is what keeps this test deterministic and network-free (see
  // `render_map_panel.test.ts`'s equivalent "no basemap" case for that behavior's own proof).
  const layerListJSON = JSON.stringify([
    { id: 'es-layer', visible: true, sourceDescriptor: { type: 'ES_SEARCH' } },
  ]);

  const MAP_DASHBOARD_ID = 'test-map-dashboard';

  const redirectPageHtml = `<!doctype html><html><head></head><body>
    <div data-shared-items-container></div>
    <script src="/bundle.js"></script>
  </body></html>`;

  // Simulates a real panel bundle reading the locator context under its real store key (see
  // `redirect_app.tsx`) and rendering panels for whichever dashboard the locator names --
  // real `data-shared-items-count` is set by the dashboard app itself once it knows its own
  // panel count, not baked into the static HTML, so this mirrors that too.
  const bundleJs = `
    var ctx = window.__KBN_SCREENSHOT_CONTEXT__['${REPORTING_REDIRECT_LOCATOR_STORE_KEY}'];
    var container = document.querySelector('[data-shared-items-container]');
    setTimeout(function () {
      if (ctx.params.dashboardId === '${MAP_DASHBOARD_ID}') {
        container.setAttribute('data-shared-items-count', '1');
        var mapItem = document.createElement('div');
        mapItem.id = 'panel-map-panel';
        var mapPanel = document.createElement('div');
        mapPanel.setAttribute('data-shared-item', '');
        // Simulates the real failure mode this dashboard exercises: maplibre-gl JS gets a
        // null WebGL context in jsdom and never calls its onRender callback, so
        // data-render-complete is stuck at "false" forever for this element -- proving
        // render_dashboard_report.ts's ignorePanelIds keeps this from blocking the
        // overall wait.
        mapPanel.setAttribute('data-render-complete', 'false');
        mapItem.appendChild(mapPanel);
        container.appendChild(mapItem);
        return;
      }

      container.setAttribute('data-shared-items-count', '2');
      var markdownItem = document.createElement('div');
      markdownItem.id = 'panel-markdown-panel';
      var markdown = document.createElement('div');
      markdown.setAttribute('data-shared-item', '');
      markdown.innerHTML = '<p>dashboard ' + ctx.params.dashboardId + '</p>';
      markdownItem.appendChild(markdown);
      container.appendChild(markdownItem);

      var chartItem = document.createElement('div');
      chartItem.id = 'panel-chart-panel';
      var chart = document.createElement('div');
      chart.setAttribute('data-shared-item', '');
      var canvas = document.createElement('canvas');
      canvas.width = 50;
      canvas.height = 50;
      canvas.getContext('2d');
      chart.appendChild(canvas);
      chartItem.appendChild(chart);
      container.appendChild(chartItem);
    }, 10);
  `;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/bundle.js') {
        res.writeHead(200, { 'content-type': 'application/javascript' });
        res.end(bundleJs);
        return;
      }
      if (req.url === `/api/saved_objects/dashboard/${DASHBOARD_ID}`) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({ attributes: { title: 'Test dashboard', panelsJSON }, references: [] })
        );
        return;
      }
      if (req.url === `/api/saved_objects/dashboard/${MAP_DASHBOARD_ID}`) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            attributes: { title: 'Map dashboard', panelsJSON: mapDashboardPanelsJSON },
            references: mapDashboardReferences,
          })
        );
        return;
      }
      if (req.url === `/api/saved_objects/map/${MAP_ID}`) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ attributes: { title: 'Test map', mapStateJSON, layerListJSON } }));
        return;
      }
      if (req.url === REPORTING_REDIRECT_APP) {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(redirectPageHtml);
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('resolves panelsJSON positions, navigates, waits for render, and composes a page', async () => {
    const client = new LoopbackHttpClient({ baseUrl, forwardedHeaders: {} });
    const locatorParams: LocatorParams = {
      id: 'DASHBOARD_APP_LOCATOR',
      version: '9.6.0',
      params: { dashboardId: DASHBOARD_ID },
    };

    const page = await renderDashboardReport({
      client,
      locatorParams,
      pageWidthPx: 1200,
      renderTimeoutMs: 2000,
    });

    expect(page.title).toBe('Test dashboard');
    expect(page.width).toBe(1200);
    expect(page.panels).toHaveLength(2);

    // Every dashboard panel -- DOM-only (markdown-panel) or canvas-backed (chart-panel) -- is
    // rasterized from its own DOM + CSS to a PNG, so both come back as bare image panels.
    for (const panel of page.panels) {
      expect(panel.html).toMatch(/^<img src="data:image\/png;base64,/);
      expect(panel.bare).toBe(true);
      expect(panel.title).toBeUndefined();
    }

    // Panels are laid side by side (x: 0 and x: 24 of 48 columns), so the second panel
    // starts to the right of the first.
    expect(page.panels[1].left).toBeGreaterThan(page.panels[0].left);
  });

  it('Phase 6: dispatches a map panel to the native MapLibre renderer, ignoring its stuck data-render-complete="false"', async () => {
    const client = new LoopbackHttpClient({ baseUrl, forwardedHeaders: {} });
    const locatorParams: LocatorParams = {
      id: 'DASHBOARD_APP_LOCATOR',
      version: '9.6.0',
      params: { dashboardId: MAP_DASHBOARD_ID },
    };

    const page = await renderDashboardReport({
      client,
      locatorParams,
      pageWidthPx: 800,
      renderTimeoutMs: 2000,
    });

    expect(page.title).toBe('Map dashboard');
    expect(page.panels).toHaveLength(1);
    // The map panel's only visible layer is ES_SEARCH (no EMS_TMS basemap), so
    // `renderMapPanel` renders a blank style without ever touching the network (see
    // `render_map_panel.test.ts`'s "no basemap" case) -- still a real PNG, proving the
    // dispatch itself, not the EMS-backed path (that is `verify_map_render.js`'s job).
    expect(page.panels[0].html).toContain('<img');
  });

  it('throws when locatorParams.params.dashboardId is missing', async () => {
    const client = new LoopbackHttpClient({ baseUrl, forwardedHeaders: {} });
    await expect(
      renderDashboardReport({
        client,
        locatorParams: { id: 'DASHBOARD_APP_LOCATOR', version: '9.6.0', params: {} },
        pageWidthPx: 1200,
      })
    ).rejects.toThrow(/dashboardId is required/);
  });
});
